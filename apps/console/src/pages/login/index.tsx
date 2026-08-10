import { useState } from "react";
import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { useLogin } from "@refinedev/core";
import { Button, Card, Checkbox, Form, Input, Typography } from "antd";

import { LottieLogo } from "../../components/lottie-logo";

type LoginForm = { email: string; password: string; remember: boolean };

// web 로그인 화면과 같은 키를 쓰는 '이메일 기억하기' — 성공 시에만 저장/삭제한다
const REMEMBER_EMAIL_KEY = "bookie-remembered-email";

// 관리자 로그인 — Refine AuthPage 대신 직접 구성한다.
// AuthPage 는 비밀번호를 <input type="password"> 로만 렌더해서 눈 아이콘(표시/숨김)을 붙일 수 없다.
export function LoginPage() {
  const { mutate: login, isPending } = useLogin<LoginForm>();
  const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
  const [showPassword, setShowPassword] = useState(false);

  return (
    // web 로그인과 같은 대비 — 회색 바탕(#f7f7f5) 위에 흰 카드
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#f7f7f5",
      }}
    >
      <Card
        style={{
          width: 400,
          background: "#fff",
          border: "none",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
        styles={{ body: { padding: 32 } }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <LottieLogo size={128} />
          {/* 폼 라벨(이메일/비밀번호)과 같은 크기 */}
          <Typography.Text type="secondary" style={{ fontSize: 14, paddingTop: 8 }}>
            늘봄 관리자로 로그인해 주세요
          </Typography.Text>
        </div>

        <Form<LoginForm>
          layout="vertical"
          requiredMark={false}
          initialValues={{
            email: rememberedEmail ?? "",
            remember: rememberedEmail !== null,
          }}
          onFinish={(values) =>
            login(values, {
              onSuccess: (data) => {
                if (!data.success) return;
                if (values.remember) {
                  localStorage.setItem(REMEMBER_EMAIL_KEY, values.email);
                } else {
                  localStorage.removeItem(REMEMBER_EMAIL_KEY);
                }
              },
            })
          }
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="email"
            label="이메일"
            rules={[{ required: true, type: "email", message: "이메일을 입력해 주세요" }]}
          >
            <Input size="large" autoComplete="username" placeholder="admin@bktk.kr" />
          </Form.Item>
          {/* antd Input.Password 는 input 을 affix 래퍼 안에 넣어서, 크롬 자동완성 하이라이트가
              래퍼 패딩·아이콘 자리를 못 덮고 일부만 칠해진다. web 로그인처럼 input 하나가 박스를
              전부 차지하고 눈 아이콘을 그 위에 얹는다. */}
          <div style={{ position: "relative" }}>
            <Form.Item
              name="password"
              label="비밀번호"
              rules={[{ required: true, message: "비밀번호를 입력해 주세요" }]}
            >
              <Input
                size="large"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="●●●●●●●●"
                style={{ paddingRight: 40 }}
              />
            </Form.Item>
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              title={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              style={{
                // 아이콘만 두면 클릭 영역이 14×14 라 잘 안 눌린다 — 32×32 히트 영역을 준다
                position: "absolute",
                top: 34,
                right: 6,
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                border: "none",
                borderRadius: 6,
                background: "none",
                cursor: "pointer",
                fontSize: 16,
                color: "rgba(0,0,0,0.45)",
              }}
            >
              {/* web 로그인과 같은 방향 — 가려진 상태에서는 '보기'를 뜻하는 뜬 눈 */}
              {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            </button>
          </div>
          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>이메일 기억하기</Checkbox>
          </Form.Item>
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            loading={isPending}
            block
          >
            로그인
          </Button>
        </Form>
      </Card>
    </div>
  );
}
