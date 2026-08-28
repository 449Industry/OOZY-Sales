OOZY 통합 관리자 웹 v1.0.0
========================================
목적
- 관리자 계정 하나로 OOZY / 박물관 / 유워시를 조회합니다.
- 웹은 조회/출력 전용입니다.
- 데이터 원본은 기존 Supabase 테이블 그대로 사용합니다.
- 자동발주, Selenium, 상품마스터, 로컬 파일 설정은 웹에 없습니다.

메뉴
1. 대시보드
   - 오늘 통합매출
   - OOZY 매출/매입
   - 박물관 매출
   - 유워시 매출
   - OOZY 최종 Supabase 업로드 시각
2. OOZY 매출: 일/월/연 조회 + 인쇄
3. OOZY 매입: 일/월/연 조회 + 인쇄
4. 박물관 장부: 일/월/연, 현금계/카드/총매출, 건별 목록 + 인쇄
5. 유워시 장부
   - 세차용품 / 수동충전 탭
   - 일/월/연 조회
   - 수동충전 실제거래 + 매칭대기 사전입력 표시
   - 인쇄

최초 1회 Supabase 설정
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
