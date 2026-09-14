OOZY 통합 관리자 웹 v1.0.10
========================================
목적
- 관리자 계정 하나로 OOZY / 박물관 / 유워시를 조회합니다.
- 매출·장부는 조회/출력 중심이며, 공동 구매요청은 공용 DB에 작성/처리할 수 있습니다.
- 데이터 원본은 기존 Supabase 테이블 그대로 사용합니다.
- 자동발주, Selenium, 상품마스터, 로컬 파일 설정은 웹에 없습니다.

메뉴
1. 대시보드
   - 우지 매출 (단독)
   - 박물관 매출 (단독)
   - 유워시 매출 (단독)
   - 우지 매입
   - OOZY 최종 Supabase 업로드 시각
2. 우지 매출: 일 상세 / 월 달력 / 연간 12개월 달력 + 인쇄
3. 우지 매입: 일/월/연 조회 + 인쇄
4. 공동 구매요청: UWASH / OOZY / KCEM 공용 요청 조회·등록·완료 처리
5. 박물관 장부: 일 상세 / 월 달력 / 연간 12개월 달력, 현금계/카드/총매출 + 인쇄
6. 유워시 장부
   - 세차용품 / 수동충전 탭
   - 일 상세 / 월 달력 / 연간 12개월 달력
   - 수동충전 실제거래 + 매칭대기 사전입력 표시
   - 인쇄

최초 1회 Supabase 설정
0. 먼저 supabase/OOZY_DB_SETUP.sql 실행
   - oozy_daily_sales / oozy_monthly_delivery_overrides / oozy_sync_status / oozy_profiles 생성
1. 같은 Supabase 프로젝트의 SQL Editor에서
   supabase/INTEGRATED_ADMIN_SETUP.sql 실행
2. 기존 관리자 계정으로 웹 로그인
   - 해당 계정이 OOZY/KCEM/UWash 중 한 곳에서 이미 admin이면
     로그인 시 같은 UID를 세 시스템 admin으로 자동 정렬합니다.
3. 새 관리자 계정이라면 SQL 맨 아래 주석의 ADMIN_EMAIL 예시를 사용해
   Auth 사용자 UID에 3개 admin 역할을 한 번 부여합니다.

로그인 아이디를 짧게 쓰고 싶은 경우
- login_aliases.js 수정
  예: window.OOZY_ADMIN_LOGIN_ALIASES = { "관리자": "admin@example.com" };
- 비밀번호는 웹 파일에 저장하지 않습니다.

Supabase 연결값
- config.js에는 Project URL과 publishable key만 들어갑니다.
- publishable key는 공개 클라이언트용 키이며 실제 접근 권한은 Auth + RLS가 결정합니다.
- service_role 키는 절대 넣지 마세요.

GitHub Pages 배포
1. GITHUB_DEPLOY.bat 실행
2. 처음 한 번 GitHub/gh 로그인을 승인
3. 기본 저장소명 OOZY-Sales 사용 또는 원하는 이름 입력
4. 완료 후 표시되는 Pages 주소 접속

로컬 테스트
- RUN_LOCAL.bat 실행 후 http://127.0.0.1:8787 접속

실시간성
- 로그인 후 10초마다 현재 화면을 Supabase에서 자동 재조회합니다.
- 우측 상단 새로고침 버튼으로 즉시 갱신할 수 있습니다.

OOZY 매출이 웹에 보이려면
- OOZY 데스크톱의 매출이 oozy_daily_sales에 업로드되어 있어야 합니다.
- 동봉된 OOZY v1.3.7 패치를 적용하면 자동 동기화 성공 후 Supabase 업로드까지 이어집니다.

v1.0.1 배포 배치 개선
- GITHUB_DEPLOY.bat 실행 중 오류가 나도 창이 자동 종료되지 않습니다.
- 같은 폴더에 github_deploy.log를 생성합니다.
- Git / GitHub CLI 설치, 로그인, 저장소 생성, push, Pages 설정을 단계별로 표시합니다.
- main push만으로 .github/workflows/pages.yml이 자동 실행되므로 별도의 workflow run 명령에 의존하지 않습니다.


v1.0.8 매출 분리/달력
- 우지 + 박물관 + 유워시 합산 KPI를 제거했습니다.
- 우지 매출은 oozy_daily_sales만 사용하며 박물관/유워시와 절대 합산하지 않습니다.
- 월 조회에서 우지/박물관/유워시 날짜별 매출 달력을 표시합니다.
- 달력 날짜 클릭 시 해당 일 상세 조회로 이동합니다.
- 유워시 달력은 선택 탭(세차용품/수동충전) 기준이며, 수동충전은 record 확정 실수납만 합산합니다.


v1.0.8 월/연 매출 달력 전용 보기
- 우지 매출 / 박물관 장부 / 유워시 장부의 월 화면은 달력만 표시합니다.
- 월 달력 아래의 중복 일별 리스트를 제거했습니다.
- 연 화면은 1~12월 연간 달력 카드로 표시합니다.
- 연간 달력에서 월을 누르면 해당 월 달력으로 이동합니다.
- 월 달력에서 날짜를 누르면 해당 일 상세로 이동합니다.
- 일 화면만 건별/상세 리스트를 표시합니다.
- 유워시는 세차용품 / 수동충전 탭별로 각각 독립된 연간 달력을 표시합니다.


v1.0.8 매입 달력
- 우지 매입 월 보기: 날짜별 총매입 달력만 표시
- 우지 매입 연 보기: 1~12월 월별 총매입 달력만 표시
- 월/연 하단 중복 리스트 제거
- 연 월 클릭 -> 월 달력, 월 날짜 클릭 -> 일 상세


v1.0.10 공동 구매요청
- 기존 public.shared_purchase_requests 테이블만 사용합니다. 별도 migration을 만들지 않습니다.
- OOZY 작성 요청은 source_site=OOZY로 자동 저장합니다.
- UWASH/OOZY/KCEM 요청을 모두 조회합니다.
- OOZY 요청만 수정/삭제 가능하며, 구매완료/완료취소는 어느 출처든 처리할 수 있습니다.
- 자연어 1줄 바로 추가, 간단 수동입력, 진행중/완료 및 사업장/우선순위/검색 필터를 제공합니다.
- 상단에서 UWASH 및 KCEM Sales로 이동할 수 있습니다.
