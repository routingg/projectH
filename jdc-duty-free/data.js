// JDC 면세점 샘플 데이터. 브랜드/구역 배치는 안내용 샘플이며 JDC 공식 데이터 연동 시 이 파일만 교체하면 됩니다.
window.JDC = {
  updated: "샘플 데이터",
  hours: { open: "06:00", close: "21:00" },
  zones: [
    { id: "west", name: "서편 구역", gate: "Gate 1–4", walk: 0, note: "국내선 출발 대합실 서쪽 끝" },
    { id: "central", name: "중앙 구역", gate: "Gate 5–7", walk: 4, note: "보안검색대 직후 메인 플라자" },
    { id: "east", name: "동편 구역", gate: "Gate 8–10", walk: 8, note: "탑승구 인접, 마지막 쇼핑" }
  ],
  categories: [
    { id: "liquor", name: "주류", icon: "🥃", minutes: 12 },
    { id: "beauty", name: "화장품·향수", icon: "🧴", minutes: 15 },
    { id: "fashion", name: "패션·잡화", icon: "👜", minutes: 15 },
    { id: "jewelry", name: "시계·주얼리", icon: "⌚", minutes: 12 },
    { id: "jeju", name: "제주 특산", icon: "🍊", minutes: 10 },
    { id: "food", name: "식품·초콜릿", icon: "🍫", minutes: 8 }
  ],
  brands: [
    { name: "조니워커", cat: "liquor", zone: "central", tag: "위스키", pick: true },
    { name: "헤네시", cat: "liquor", zone: "central", tag: "코냑" },
    { name: "돔 페리뇽", cat: "liquor", zone: "central", tag: "샴페인" },
    { name: "제주 감귤주", cat: "liquor", zone: "west", tag: "제주 한정", pick: true },
    { name: "SK-II", cat: "beauty", zone: "central", tag: "스킨케어", pick: true },
    { name: "디올 뷰티", cat: "beauty", zone: "central", tag: "메이크업" },
    { name: "설화수", cat: "beauty", zone: "east", tag: "K-뷰티" },
    { name: "이니스프리 제주", cat: "beauty", zone: "west", tag: "제주 원료", pick: true },
    { name: "조 말론", cat: "beauty", zone: "east", tag: "향수" },
    { name: "에르메스", cat: "fashion", zone: "east", tag: "스카프·잡화" },
    { name: "코치", cat: "fashion", zone: "east", tag: "가방" },
    { name: "레이밴", cat: "fashion", zone: "central", tag: "선글라스" },
    { name: "여행 소품관", cat: "fashion", zone: "west", tag: "캐리어·파우치" },
    { name: "스와로브스키", cat: "jewelry", zone: "east", tag: "주얼리" },
    { name: "타임피스 존", cat: "jewelry", zone: "east", tag: "시계" },
    { name: "제주 감귤 초콜릿", cat: "jeju", zone: "west", tag: "베스트셀러", pick: true },
    { name: "한라봉·오메기 선물세트", cat: "jeju", zone: "west", tag: "선물" },
    { name: "제주 녹차·보리 스낵", cat: "jeju", zone: "west", tag: "간식" },
    { name: "프리미엄 초콜릿관", cat: "food", zone: "central", tag: "수입 초콜릿" },
    { name: "건강식품관", cat: "food", zone: "central", tag: "홍삼·비타민" }
  ],
  promos: [
    { title: "초콜릿 기획전", body: "수입·제주 초콜릿 묶음 구성 행사", zone: "central" },
    { title: "제주 한정 컬렉션", body: "공항 면세점에서만 만나는 제주 원료 상품", zone: "west" },
    { title: "출발 직전 쇼핑 존", body: "탑승구 인접 동편 구역 빠른 결제", zone: "east" }
  ],
  business: {
    pillars: [
      { t: "제주 공항 면세 운영", d: "제주국제공항 내 면세점을 직접 운영하며 내국인 쇼핑 수요를 관광 수익으로 연결합니다." },
      { t: "제주 브랜드 육성", d: "제주 원료·특산 브랜드에 판매 채널을 열어 지역 기업의 성장을 지원합니다." },
      { t: "수익의 지역 환원", d: "공공기관으로서 면세 사업 수익을 제주 국제자유도시 조성과 지역 발전에 활용합니다." },
      { t: "입점 파트너십", d: "국내외 브랜드와 제주 로컬 기업을 위한 입점·팝업·공동 마케팅을 제안합니다." }
    ],
    flow: ["여행객 쇼핑", "면세점 매출", "사업 수익", "제주 지역 환원", "관광·산업 성장", "더 많은 여행객"],
    note: "수치형 실적(매출·방문객·입점 브랜드 수)은 JDC 공식 자료 확인 후 입력하세요. 임의 수치는 표시하지 않습니다."
  }
};
