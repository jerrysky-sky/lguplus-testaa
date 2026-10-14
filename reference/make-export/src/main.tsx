// ============================================================
// [파일 요약]
// 이 파일은 React 앱의 "시작점(entry point)"이다.
// 브라우저가 index.html을 열면 <script src="/src/main.tsx">로 이 파일이 실행되고,
// 앱 전체를 담고 있는 <App /> 컴포넌트를 HTML 안의 <div id="root"> 자리에 그려 넣는다.
//
// [실행 흐름]
// ① 필요한 라이브러리·컴포넌트·스타일을 불러온다(import)
// → ② index.html에서 id가 "root"인 빈 div를 찾는다
// → ③ 그 div를 React가 관리하는 화면 영역(root)으로 만든다
// → ④ 그 안에 <App />을 그린다(render)
//
// [용어집]
// - React       : 화면(UI)을 "컴포넌트"라는 작은 부품으로 나눠 만드는 자바스크립트 라이브러리
// - ReactDOM    : React로 만든 컴포넌트를 실제 브라우저 화면(DOM)에 그려주는 도구
// - DOM         : 브라우저가 HTML을 읽어 메모리에 만든 "화면 요소들의 나무 구조"
// - 컴포넌트     : 화면의 한 조각을 만드는 함수. <App />처럼 HTML 태그 모양으로 사용한다
// - JSX / TSX   : 자바스크립트 안에 HTML처럼 생긴 코드(<App /> 등)를 쓸 수 있게 한 문법.
//                 .tsx는 TypeScript(타입이 있는 자바스크립트) + JSX 파일이라는 뜻
// - StrictMode  : 개발 중에만 동작하는 "검사 모드". 실수하기 쉬운 코드를 경고해 준다
// - Vite        : 이 프로젝트의 개발 서버/빌드 도구. index.html → main.tsx 순서로 앱을 실행한다
// ============================================================

// React 라이브러리 본체. 아래의 <React.StrictMode>를 쓰기 위해 불러온다
import React from 'react'
// 'react-dom/client'는 브라우저용 화면 그리기 도구 (React 18부터 쓰는 createRoot 방식)
import ReactDOM from 'react-dom/client'
// 같은 폴더의 App.tsx 파일에서 앱의 최상위 컴포넌트를 불러온다 (확장자 .tsx는 생략 가능)
import App from './App'
// CSS 파일은 변수로 받지 않고 import만 해도 앱 전체에 스타일이 적용된다 (Vite가 처리)
import './index.css'

// document.getElementById('root') : index.html에 있는 <div id="root"></div>를 찾는다
// 끝의 '!' (TypeScript 문법) : "이 값은 절대 null이 아니다"라고 TypeScript에 알려주는 표시.
//   getElementById는 요소를 못 찾으면 null을 돌려줄 수 있어서, 이 표시가 없으면 타입 오류가 난다.
//   (주의: 실제로 root div가 없으면 실행 중 오류가 나므로 index.html의 id와 반드시 일치해야 한다)
// createRoot(...) : 찾은 div를 React가 관리하는 화면 영역으로 만든다
// .render(...)    : 괄호 안의 컴포넌트를 그 영역에 그린다
ReactDOM.createRoot(document.getElementById('root')!).render(
  // StrictMode로 앱 전체를 감싸 개발 중 잠재적인 문제를 경고받는다.
  // 개발 모드에서는 일부 코드가 일부러 두 번 실행되므로 console.log가 두 번 찍혀도 정상이다.
  // 실제 배포(빌드) 버전에서는 아무 영향이 없다.
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
