/* APL Motion — 공통 레이어 (코칭/측정 모드 공유)
   - localStorage 키 통일 + 기존 분산 키 자동 마이그레이션
   - 프리미엄(SHA-256) 공통 검증: 한 번 해제하면 두 모드 모두 적용
   - 언어/신장 설정 공유
   사용: 각 페이지 <script type="module">에서  import { Prefs, unlock, BRAND } from '../shared/common.js'
*/

export const BRAND = {
  name: 'APL Motion',
  site: 'apl2018.github.io/apl-motion',
};

// ── 통일 localStorage 키 ──
const K = { prm:'apl_prm', lang:'apl_lang', height:'apl_height' };

// ── 기존 분산 키 → 통합 키 1회성 흡수 (사용자 데이터 보존) ──
// 3D 앱: apl3d_prm / 2D 앱: 별도 키가 있었다면 여기에 추가
(function migrate(){
  const map = {
    prm:    ['apl3d_prm','aplc_prm','apl_premium'],
    lang:   ['apl3d_lang','aplc_lang'],
    height: ['apl3d_h','apl3d_height','aplc_height'],
  };
  for(const [k, olds] of Object.entries(map)){
    if(localStorage.getItem(K[k]) !== null) continue;     // 이미 통합 키 있으면 스킵
    for(const o of olds){
      const v = localStorage.getItem(o);
      if(v !== null){ localStorage.setItem(K[k], v); break; }
    }
  }
})();

export const Prefs = {
  get lang(){ return localStorage.getItem(K.lang) || 'ko'; },
  set lang(v){ localStorage.setItem(K.lang, v); },

  get height(){ return +localStorage.getItem(K.height) || 170; },
  set height(v){ localStorage.setItem(K.height, String(v)); },

  get premium(){ return localStorage.getItem(K.prm) === '1'; },
  set premium(v){ localStorage.setItem(K.prm, v ? '1' : '0'); },
};

// ── 공통 프리미엄 해제 ── SHA-256("APL2024")
const PW_HASH = '6e9a16337d5d2c2302e87aeba5cae99ee0f5aa2c5c789504285018b53d26e3c9';
export async function unlock(pw){
  try{
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
    const hex = [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
    if(hex === PW_HASH){ Prefs.premium = true; return true; }
  }catch(e){}
  return false;
}
