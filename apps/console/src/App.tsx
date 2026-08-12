import { Refine, Authenticated } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import {
  ErrorComponent,
  useNotificationProvider,
  ThemedLayout,
} from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";

import { App as AntdApp, Typography } from "antd";
import { BrowserRouter, Route, Routes, Outlet } from "react-router";
import routerProvider, {
  NavigateToResource,
  CatchAllNavigate,
  UnsavedChangesNotifier,
  DocumentTitleHandler,
} from "@refinedev/react-router";
import { dataProvider } from "./providers/data";
import { ColorModeContextProvider } from "./contexts/color-mode";
import { Header } from "./components/header";
import authProvider from "./providers/auth";

// 특정 문구만 바꾸기 위한 최소 i18n — 나머지 키는 기본 문구를 그대로 통과시킨다.
// refine 기본 버튼 라벨이 전부 영문이라 여기서 한국어로 덮는다.
// (목록 버튼은 buttons.list가 아니라 리소스 meta.label을 쓰므로 여기 없다)
const BUTTON_LABELS: Record<string, string> = {
  "buttons.create": "새로 만들기",
  "buttons.edit": "수정",
  "buttons.show": "상세",
  "buttons.clone": "복제",
  "buttons.delete": "삭제",
  "buttons.save": "저장",
  "buttons.cancel": "취소",
  "buttons.confirm": "정말로 삭제할까요?",
  "buttons.refresh": "새로고침",
  "buttons.filter": "필터",
  "buttons.clear": "초기화",
  "buttons.logout": "로그아웃",
  "buttons.export": "내보내기",
  "buttons.import": "가져오기",
  "buttons.undo": "되돌리기",
  "buttons.notAccessTitle": "접근 권한이 없습니다",
  warnWhenUnsavedChanges:
    "저장하지 않은 변경사항이 있습니다. 정말 나갈까요?",
};

const i18nProvider = {
  translate: (key: string, options?: unknown, defaultMessage?: string) => {
    const fallback =
      typeof options === "string" ? options : defaultMessage;
    return BUTTON_LABELS[key] ?? fallback ?? key;
  },
  changeLocale: () => Promise.resolve(),
  getLocale: () => "ko",
};
import { WeekCreate, WeekEdit, WeekList } from "./pages/weeks";
import {
  LessonCreate,
  LessonEdit,
  LessonList,
  LessonShow,
} from "./pages/lessons";
import { SchoolCreate, SchoolEdit, SchoolList, SchoolShow } from "./pages/schools";
import {
  AssociationCreate,
  AssociationEdit,
  AssociationList,
} from "./pages/associations";
import { LoginPage } from "./pages/login";
import { UserEdit, UserList, UserShow } from "./pages/users";

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <AntdApp>
            <DevtoolsProvider>
              <Refine
                dataProvider={dataProvider}
                authProvider={authProvider}
                i18nProvider={i18nProvider}
                routerProvider={routerProvider}
                notificationProvider={useNotificationProvider}
                resources={[
                  {
                    name: "weeks",
                    list: "/weeks",
                    create: "/weeks/create",
                    edit: "/weeks/edit/:id",
                    meta: { label: "주차" },
                  },
                  {
                    name: "lessons",
                    list: "/lessons",
                    create: "/lessons/create",
                    edit: "/lessons/edit/:id",
                    show: "/lessons/show/:id",
                    meta: { label: "수업" },
                  },
                  {
                    name: "schools",
                    list: "/schools",
                    create: "/schools/create",
                    edit: "/schools/edit/:id",
                    show: "/schools/show/:id",
                    meta: { label: "학교" },
                  },
                  {
                    name: "associations",
                    list: "/associations",
                    create: "/associations/create",
                    edit: "/associations/edit/:id",
                    meta: { label: "소속" },
                  },
                  {
                    name: "users",
                    list: "/users",
                    edit: "/users/edit/:id",
                    show: "/users/show/:id",
                    meta: { label: "사용자" },
                  },
                ]}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                }}
              >
                <Routes>
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-inner"
                        fallback={<CatchAllNavigate to="/login" />}
                      >
                        <ThemedLayout
                          Header={Header}
                          Title={({ collapsed }) => (
                            <a
                              href="/"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                textDecoration: "none",
                              }}
                            >
                              <img
                                src="/favicon.svg"
                                alt="북키톡키"
                                style={{ height: 26, width: 26 }}
                              />
                              {!collapsed && (
                                <Typography.Text
                                  strong
                                  style={{ fontSize: 16, whiteSpace: "nowrap" }}
                                >
                                  북키톡키 관리자
                                </Typography.Text>
                              )}
                            </a>
                          )}
                        >
                          <Outlet />
                        </ThemedLayout>
                      </Authenticated>
                    }
                  >
                    <Route index element={<NavigateToResource resource="weeks" />} />
                    <Route path="/weeks">
                      <Route index element={<WeekList />} />
                      <Route path="create" element={<WeekCreate />} />
                      <Route path="edit/:id" element={<WeekEdit />} />
                    </Route>
                    <Route path="/lessons">
                      <Route index element={<LessonList />} />
                      <Route path="create" element={<LessonCreate />} />
                      <Route path="edit/:id" element={<LessonEdit />} />
                      <Route path="show/:id" element={<LessonShow />} />
                    </Route>
                    <Route path="/schools">
                      <Route index element={<SchoolList />} />
                      <Route path="create" element={<SchoolCreate />} />
                      <Route path="edit/:id" element={<SchoolEdit />} />
                      <Route path="show/:id" element={<SchoolShow />} />
                    </Route>
                    <Route path="/associations">
                      <Route index element={<AssociationList />} />
                      <Route path="create" element={<AssociationCreate />} />
                      <Route path="edit/:id" element={<AssociationEdit />} />
                    </Route>
                    <Route path="/users">
                      <Route index element={<UserList />} />
                      <Route path="edit/:id" element={<UserEdit />} />
                      <Route path="show/:id" element={<UserShow />} />
                    </Route>
                    <Route path="*" element={<ErrorComponent />} />
                  </Route>
                  <Route
                    element={
                      <Authenticated key="authenticated-outer" fallback={<Outlet />}>
                        <NavigateToResource resource="weeks" />
                      </Authenticated>
                    }
                  >
                    <Route path="/login" element={<LoginPage />} />
                  </Route>
                </Routes>
                <RefineKbar />
                <UnsavedChangesNotifier />
                {/* 브라우저 탭 제목: 기본 "... | Refine" 접미사를 북키톡키로 교체 */}
                <DocumentTitleHandler
                  handler={({ autoGeneratedTitle }) =>
                    autoGeneratedTitle.replace(/Refine$/, "북키톡키")
                  }
                />
              </Refine>
              <DevtoolsPanel />
            </DevtoolsProvider>
          </AntdApp>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
