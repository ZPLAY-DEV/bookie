import { Refine, Authenticated } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import {
  AuthPage,
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
import { WeekCreate, WeekEdit, WeekList } from "./pages/weeks";
import {
  LessonCreate,
  LessonEdit,
  LessonList,
  LessonShow,
} from "./pages/lessons";
import { SchoolCreate, SchoolEdit, SchoolList } from "./pages/schools";
import {
  AssociationCreate,
  AssociationEdit,
  AssociationList,
} from "./pages/associations";

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
                    meta: { label: "학교" },
                  },
                  {
                    name: "associations",
                    list: "/associations",
                    create: "/associations/create",
                    edit: "/associations/edit/:id",
                    meta: { label: "강사 소속" },
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
                    </Route>
                    <Route path="/associations">
                      <Route index element={<AssociationList />} />
                      <Route path="create" element={<AssociationCreate />} />
                      <Route path="edit/:id" element={<AssociationEdit />} />
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
                    <Route
                      path="/login"
                      element={
                        <AuthPage
                          type="login"
                          title={
                            <img
                              src="/favicon.svg"
                              alt="제트플레이 늘봄교육"
                              style={{ height: 64 }}
                            />
                          }
                        />
                      }
                    />
                  </Route>
                </Routes>
                <RefineKbar />
                <UnsavedChangesNotifier />
                <DocumentTitleHandler />
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
