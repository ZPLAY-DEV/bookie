import { List, useTable } from "@refinedev/antd";
import { Avatar, Select, Space, Table, Typography } from "antd";
import { InlineEditCell } from "../../components/inline-edit-cell";

export type User = {
  id: string; // Supabase auth user id (uuid)
  name: string | null;
  role: string; // pending | teacher | admin
  profileImageUrl: string | null;
  socialUserId: string | null;
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
        <Table.Column
          dataIndex="createdAt"
          title="가입일"
          sorter
          render={(createdAt: string) =>
            new Date(createdAt).toLocaleDateString("ko-KR")
          }
        />
      </Table>
    </List>
  );
};
