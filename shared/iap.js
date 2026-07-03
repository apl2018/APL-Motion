/* trajix — 인앱결제(IAP) 연동
   - 네이티브(iOS, Capacitor)에서만 동작. 웹에서는 비활성(기존 비밀번호 경로 유지).
   - 플러그인: cordova-plugin-purchase (CdvPurchase) — 자체 완결형(서드파티 서버 불필요).
   - 상품: 비소모성(NON_CONSUMABLE) 영구 프리미엄 해제.
   - 결제/복원 성공 → 프리미엄 키 세팅(모든 모드 공유) → 화면 갱신.
   런처 <head> 또는 body 끝에:  <script src="./shared/iap.js"></script>
*/
(function () {
  'use strict';
  var PRODUCT_ID = 'com.apl.trajix.premium';   // App Store Connect 제품ID와 동일해야 함
  var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  // 프리미엄 부여: 통합 키 + 레거시 키 모두 세팅(코칭/측정 모드 자체 키 대비)
  function grantPremium() {
    ['apl_prm', 'apl3d_prm', 'aplc_prm', 'apl_premium'].forEach(function (k) {
      try { localStorage.setItem(k, '1'); } catch (e) {}
    });
    try { window.dispatchEvent(new Event('trajix-premium-changed')); } catch (e) {}
  }

  var API = {
    native: isNative,
    ready: false,
    price: '',
    owned: false,
    buy: function () { alert('앱에서만 구매할 수 있습니다.'); },
    restore: function () { alert('앱에서만 복원할 수 있습니다.'); }
  };
  window.TrajixIAP = API;

  if (!isNative) return;  // 웹: 비밀번호 경로 유지

  function toast(msg) {
    try {
      var d = document.createElement('div');
      d.textContent = msg;
      d.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:99999;'
        + 'background:#0f1830;color:#fff;padding:10px 16px;border-radius:10px;font-size:13px;'
        + 'box-shadow:0 6px 24px rgba(0,0,0,.4)';
      document.body.appendChild(d);
      setTimeout(function () { d.remove(); }, 2600);
    } catch (e) {}
  }

  function initStore() {
    if (!window.CdvPurchase) { console.warn('[IAP] CdvPurchase 미로드'); return; }
    var CdvPurchase = window.CdvPurchase;
    var store = CdvPurchase.store;
    var Platform = CdvPurchase.Platform;
    var ProductType = CdvPurchase.ProductType;

    store.register([{
      id: PRODUCT_ID,
      type: ProductType.NON_CONSUMABLE,
      platform: Platform.APPLE_APPSTORE
    }]);

    store.when()
      .approved(function (t) { t.verify(); })
      .verified(function (r) {
        grantPremium(); API.owned = true;
        toast('프리미엄이 활성화되었습니다 ✓');
        r.finish();
        setTimeout(function () { location.reload(); }, 1200);
      })
      .receiptUpdated(function () {
        var p = store.get(PRODUCT_ID, Platform.APPLE_APPSTORE);
        if (p && p.owned) { grantPremium(); API.owned = true; }
      });

    store.error(function (err) {
      console.warn('[IAP] error', err);
      // 6777003=취소 등: 조용히 무시, 그 외 안내
      if (err && err.code !== CdvPurchase.ErrorCode && String(err.message || '').indexOf('cancel') < 0)
        toast('결제 오류: ' + (err.message || err.code || ''));
    });

    store.initialize([Platform.APPLE_APPSTORE]).then(function () {
      var p = store.get(PRODUCT_ID, Platform.APPLE_APPSTORE);
      if (p) {
        var offer = p.getOffer && p.getOffer();
        API.price = (p.pricing && p.pricing.price) || (offer && offer.pricingPhases && offer.pricingPhases[0] && offer.pricingPhases[0].price) || '';
        if (p.owned) { grantPremium(); API.owned = true; }
      }
      API.ready = true;
      injectUI();
    });

    API.buy = function () {
      var p = store.get(PRODUCT_ID, Platform.APPLE_APPSTORE);
      var offer = p && p.getOffer && p.getOffer();
      if (offer) offer.order().then(function (e) { if (e) toast('구매를 완료할 수 없습니다.'); });
      else toast('상품 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
    };
    API.restore = function () {
      toast('구매 내역을 복원하는 중…');
      store.restorePurchases();
    };
  }

  // 프리미엄 모달에 [구매]/[복원] 버튼 주입 + 비밀번호 입력 숨김(네이티브)
  function injectUI() {
    var box = document.getElementById('prm-box');
    if (!box || document.getElementById('iap-buy')) return;
    var input = document.getElementById('prm-input');
    var err = document.getElementById('prm-err');
    var confirm = document.getElementById('prm-confirm');
    if (input) input.style.display = 'none';
    if (err) err.style.display = 'none';
    if (confirm) confirm.style.display = 'none';
    var desc = document.getElementById('prm-desc');
    if (desc) desc.innerHTML = '전체 종목 · 정밀/비교 분석 등 프리미엄 기능을<br>한 번 구매로 영구 사용할 수 있습니다.';

    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:12px';
    var buy = document.createElement('button');
    buy.id = 'iap-buy';
    buy.textContent = '프리미엄 구매' + (API.price ? ' (' + API.price + ')' : '');
    buy.style.cssText = 'padding:13px;border-radius:10px;border:none;cursor:pointer;font-size:15px;font-weight:700;background:linear-gradient(135deg,#FFD700,#FFA000);color:#000';
    buy.onclick = function () { API.buy(); };
    var restore = document.createElement('button');
    restore.id = 'iap-restore';
    restore.textContent = '구매 복원';
    restore.style.cssText = 'padding:11px;border-radius:10px;border:none;cursor:pointer;font-size:13px;background:rgba(255,255,255,.10);color:#cfd6ee';
    restore.onclick = function () { API.restore(); };
    wrap.appendChild(buy); wrap.appendChild(restore);
    // 취소 버튼 위(있으면)로 삽입
    var row = box.querySelector('.prm-row');
    if (row) box.insertBefore(wrap, row); else box.appendChild(wrap);
  }

  document.addEventListener('deviceready', initStore, false);
  // Capacitor는 deviceready 없이도 플러그인 로드됨 → DOM 준비 후 시도
  if (document.readyState !== 'loading') setTimeout(initStore, 300);
  else document.addEventListener('DOMContentLoaded', function () { setTimeout(initStore, 300); });
})();
