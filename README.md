# WheelTrip Jeju (ProjectH)

휠체어 이용자·이동약자의 제주 여행을 위한 **당일 이동가능성 예측 + 출도 전 공항 동선 안내** AI 서비스.

단순 무장애 관광지 목록이 아니라, 무장애 관광정보 · 기상청 예보/특보 · 저상버스 · 한국공항공사 공항 도면/입점업체 · JDC 면세점 매장정보를 결합하여
"오늘 실제로 이동 가능한 일정"과 "출도 전 공항 내 이동·체류 동선"을 추천한다.

## 구조

```
backend/   FastAPI 서버 (점수화·추천·일정재구성·공항동선·JDC·RAG gateway)
frontend/  React + Vite + TypeScript
docs/      데이터 출처 문서
```

## 개발 환경

conda 환경 `projecth` (Python 3.11 + Node.js) 사용.

```bash
conda create -n projecth python=3.11 nodejs
conda activate projecth
```

### 백엔드 실행

```bash
conda activate projecth
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
# http://localhost:8000/docs
```

### 프론트엔드 실행

```bash
conda activate projecth
cd frontend
npm install
npm run dev
# http://localhost:5173
```

## 배포

Render에 배포되어 있다 (`render.yaml`).

| 구분 | 주소 |
| --- | --- |
| 프론트엔드 (정적 사이트) | https://wheeltrip-jeju-frontend.onrender.com/ |
| 백엔드 (FastAPI) | https://wheeltrip-jeju-backend.onrender.com (`/docs`, `/health`) |

- 백엔드 환경변수 `KMA_API_KEY`, `JDC_API_KEY`, `DATA_GO_KR_API_KEY`, `KAKAO_REST_KEY`는 Render 대시보드에서 설정한다 (`sync: false`).
- 프론트엔드 환경변수 `VITE_API_BASE`(백엔드 주소), `VITE_KAKAO_MAP_KEY`는 빌드 시점에 반영되므로 변경 후 재배포가 필요하다.
- 무료 플랜이라 일정 시간 요청이 없으면 백엔드가 잠들어 첫 요청이 느릴 수 있다.
- `backend/data/processed/*`는 `.gitignore` 대상이다. 배포에 필요한 데이터 파일은 `git add -f`로 추가해야 한다.

## JDC 면세점 쇼핑 경로

플래너 ⑤ 공항 동선 단계에서 출도 시간에 맞춘 면세점 쇼핑 경로를 안내한다.

- **내 주변 매장**: 현재 Gate(1~12) 기준으로 JDC 매장 3곳(동편·본·서편)의 도보 거리·시간을 보여준다.
- **브랜드 검색**: 입점 브랜드 94곳을 매장·구획별로 조회한다.
- **쇼핑 경로**: 관심 카테고리와 시작 시간을 고르면 방문 순서, 이동 시간, 매장별 쇼핑 시간을 만든다.
  탑승 마감 전까지 이동 시간을 뺀 남은 시간을 매장별 입점 수에 비례해 나눈다.

| API | 설명 |
| --- | --- |
| `GET /api/jdc/wayfinder` | 매장·입점 브랜드·카테고리·Gate 목록 |
| `GET /api/jdc/nearby?gate=N` | Gate 기준 가까운 매장 순 |
| `POST /api/jdc/shopping-route` | 출도 시간 기반 쇼핑 경로 |
| `GET /api/jdc/stores` | JDC 공식 API 매장정보 (키 없으면 mock) |

### 데이터 출처와 한계

- 매장·입점 브랜드·Gate 동선은 [JDC 웨이파인더](https://jdc-shopping-guide.routing0214.workers.dev/) 데이터를
  `backend/data/processed/jdc_wayfinder.json`에 옮긴 것이다 (추출일은 파일의 `extracted_at`). JDC 공식 데이터와의 일치는 검증하지 않았다.
- 이동 시간은 해당 사이트의 환산식(미터 = 1.2 × 가중치, 보행 70m/분)을 따르며 휠체어 이동 속도·엘리베이터 대기, 매장 내부 이동은 반영하지 않는다.
- 탑승 마감(출발 20분 전)과 시작 시간 미입력 시 기본값(출발 80분 전)은 임의 가정이며 응답의 `assumptions`로 노출한다.
- 해당 사이트의 상품·가격 데이터는 상품-매장 배정이 데모라서 사용하지 않는다.
## 범위

- Claude Code 담당: 백엔드/프론트/데이터 전처리/점수화/추천/일정재구성/공항동선/JDC/RAG 연동 gateway
- RAG(LLM 추천 설명)는 별도 팀원 담당. 백엔드는 `/api/rag/recommend` gateway로 연결만 하며, 미연결 시 mock 설명을 반환한다.

## 주의

- 추천 결과는 **참고 정보**이며 휠체어 접근 가능성이나 안전을 보장하지 않는다.
- 데이터에서 확인되지 않은 정보는 "정보 없음"으로 표시한다.
- JDC 데이터는 **면세점 매장정보 안내에만** 사용한다. 공항 편의시설/동선은 한국공항공사 데이터를 사용한다.
  (쇼핑 경로의 Gate 간 이동은 면세점 매장까지의 안내용 추정이며 공항 편의시설 동선이 아니다.)
