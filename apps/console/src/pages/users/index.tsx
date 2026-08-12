import {
  Edit,
  EditButton,
  List,
  Show,
  ShowButton,
  useForm,
  useTable,
} from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import {
  Avatar,
  Descriptions,
  Form,
  Input,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import { InlineEditCell } from "../../components/inline-edit-cell";

export type User = {
  id: string; // Supabase auth user id (uuid)
  name: string | null;
  role: string; // pending | teacher | admin
  profileImageUrl: string | null;
  socialUserId: string | null;
  note: string | null; // 관리자용 메모 (최대 64자)
  createdAt: string;
  email: string | null; // auth.users 원본 — 카카오 미제공이면 null
  phone: string | null;
};

// pending = 가입 직후 기본 상태. 사전 등록(소속) 매칭으로 자동 승인되거나
// 관리자가 여기서 직접 올린다.
const ROLE_OPTIONS = [
  { value: "pending", label: "승인 대기" },
  { value: "teacher", label: "강사" },
  { value: "admin", label: "관리자" },
];

const NOTE_MAX = 64;

const roleLabel = (role: string) =>
  ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;

export const UserList = () => {
  const { tableProps, filters, setFilters } = useTable<User>({
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  });

  const roleFilter = filters.find(
    (f) => "field" in f && f.field === "role",
  ) as { value?: string } | undefined;

  return (
    <List
      headerButtons={
        <Select
          allowClear
          placeholder="권한 전체"
          style={{ width: 140 }}
          value={roleFilter?.value}
          options={ROLE_OPTIONS}
          onChange={(value) =>
            setFilters([{ field: "role", operator: "eq", value: value ?? null }])
          }
        />
      }
    >
      <Table {...tableProps} rowKey="id">
        <Table.Column<User>
          dataIndex="name"
          title="이름"
          sorter
          render={(name: string | null, record) => (
            <Space>
              <Avatar src={record.profileImageUrl} size="small">
                {name?.[0]}
              </Avatar>
              {name ?? "-"}
            </Space>
          )}
        />
        <Table.Column<User>
          dataIndex="role"
          title="권한"
          width={130}
          sorter
          render={(_, record) => (
            <InlineEditCell
              resource="users"
              id={record.id}
              field="role"
              value={record.role}
              type="select"
              options={ROLE_OPTIONS}
              required
            />
          )}
        />
        <Table.Column<User>
          dataIndex="note"
          title="메모"
          render={(_, record) => (
            <InlineEditCell
              resource="users"
              id={record.id}
              field="note"
              value={record.note}
              placeholder={`메모 (${NOTE_MAX}자 이내)`}
              maxLength={NOTE_MAX}
            />
          )}
        />
        <Table.Column
          dataIndex="email"
          title="이메일"
          render={(email: string | null) =>
            email ?? <Typography.Text type="danger">미제공</Typography.Text>
          }
        />
        <Table.Column
          dataIndex="phone"
          title="전화번호"
          render={(phone: string | null) => phone ?? "-"}
        />
        <Table.Column
          dataIndex="createdAt"
          title="가입일"
          sorter
          render={(createdAt: string) =>
            new Date(createdAt).toLocaleDateString("ko-KR")
          }
        />
        <Table.Column<User>
          title="동작"
          width={90}
          render={(_, record) => (
            <Space>
              <ShowButton hideText size="small" recordItemId={record.id} />
              <EditButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};

export const UserShow = () => {
  const { query } = useShow<User>();
  const user = query.data?.data;
  if (!user) return null;
  return (
    <Show title={user.name ?? "사용자"}>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="이름">
          <Space>
            <Avatar src={user.profileImageUrl} size="small">
              {user.name?.[0]}
            </Avatar>
            {user.name ?? "-"}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="권한">{roleLabel(user.role)}</Descriptions.Item>
        <Descriptions.Item label="이메일">
          {user.email ?? <Typography.Text type="danger">미제공</Typography.Text>}
        </Descriptions.Item>
        <Descriptions.Item label="전화번호">{user.phone ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="메모" span={2}>
          {user.note ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="소셜 ID">
          {user.socialUserId ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="가입일">
          {new Date(user.createdAt).toLocaleString("ko-KR")}
        </Descriptions.Item>
      </Descriptions>
    </Show>
  );
};

export const UserEdit = () => {
  const { formProps, saveButtonProps, query } = useForm<User>();
  const user = query?.data?.data;
  return (
    <Edit saveButtonProps={saveButtonProps} title={user?.name ?? "사용자 수정"}>
      <Form {...formProps} layout="vertical">
        {/* 이름·이메일·전화번호는 auth 계정에서 오므로 콘솔에서 고치지 않는다 */}
        <Form.Item label="이메일">
          <Typography.Text>{user?.email ?? "미제공"}</Typography.Text>
        </Form.Item>
        <Form.Item label="전화번호">
          <Typography.Text>{user?.phone ?? "-"}</Typography.Text>
        </Form.Item>
        <Form.Item label="권한" name="role" rules={[{ required: true }]}>
          <Select options={ROLE_OPTIONS} style={{ maxWidth: 240 }} />
        </Form.Item>
        <Form.Item
          label="메모"
          name="note"
          rules={[{ max: NOTE_MAX, message: `${NOTE_MAX}자 이내로 입력해 주세요` }]}
        >
          <Input allowClear showCount maxLength={NOTE_MAX} />
        </Form.Item>
      </Form>
    </Edit>
  );
};
