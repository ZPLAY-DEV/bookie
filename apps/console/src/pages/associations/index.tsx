import {
  Create,
  DeleteButton,
  Edit,
  EditButton,
  List,
  useForm,
  useSelect,
  useTable,
} from "@refinedev/antd";
import { Avatar, Form, Input, Select, Space, Table, Tag } from "antd";
import type { User } from "../users";

type Association = {
  id: number;
  schoolId: number;
  email: string | null;
  phone: string | null;
  userId: string | null;
  status: string; // invited | active
  createdAt: string;
};

type School = { id: number; name: string };

const useSchoolSelect = () =>
  useSelect<School>({
    resource: "schools",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
    pagination: { pageSize: 100 },
  });

// 연결된 사용자를 아바타+이름으로 보여주기 위한 조회 (users 확장 뷰 = auth 이메일 포함)
const useUserSelect = () =>
  useSelect<User>({
    resource: "users",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "name", order: "asc" }],
    pagination: { pageSize: 100 },
  });

// 상태: invited(사전 등록, 로그인 대기) → active(강사 로그인으로 연결됨)
const STATUS_TAGS: Record<string, { color: string; label: string }> = {
  invited: { color: "orange", label: "등록됨(대기)" },
  active: { color: "green", label: "활성" },
};

export const AssociationList = () => {
  const { tableProps } = useTable<Association>({
    sorters: { initial: [{ field: "id", order: "asc" }] },
  });
  const { query: schoolQuery } = useSchoolSelect();
  const schoolName = (schoolId: number) =>
    schoolQuery.data?.data.find((s) => s.id === schoolId)?.name ?? schoolId;
  const { query: userQuery } = useUserSelect();
  const users = userQuery.data?.data ?? [];

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column<Association>
          dataIndex="schoolId"
          title="학교"
          sorter
          render={(schoolId: number) => schoolName(schoolId)}
        />
        <Table.Column dataIndex="email" title="이메일" />
        <Table.Column dataIndex="phone" title="전화번호" />
        <Table.Column
          dataIndex="status"
          title="상태"
          sorter
          render={(status: string) => {
            const tag = STATUS_TAGS[status] ?? { color: "default", label: status };
            return <Tag color={tag.color}>{tag.label}</Tag>;
          }}
        />
        <Table.Column
          dataIndex="userId"
          title="연결된 사용자"
          render={(userId: string | null) => {
            if (!userId) return "-";
            // 목록에 없으면(100건 초과 등) uuid 앞자리로 폴백
            const user = users.find((u) => u.id === userId);
            if (!user) return `${userId.slice(0, 8)}…`;
            const label = user.name ?? user.email ?? `${userId.slice(0, 8)}…`;
            return (
              <Space>
                <Avatar src={user.profileImageUrl} size="small">
                  {label[0]}
                </Avatar>
                {label}
              </Space>
            );
          }}
        />
        <Table.Column<Association>
          title="동작"
          render={(_, record) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};

// 사전 등록 폼 — 이메일/전화 중 하나는 필수 (API에서도 검증)
const AssociationFormFields = () => {
  const { selectProps } = useSchoolSelect();
  return (
    <>
      <Form.Item label="학교" name="schoolId" rules={[{ required: true }]}>
        <Select {...selectProps} />
      </Form.Item>
      <Form.Item
        label="이메일"
        name="email"
        rules={[{ type: "email", message: "올바른 이메일 형식이 아닙니다" }]}
        extra="강사가 로그인할 때 쓰는 이메일 (카카오 계정 이메일)"
      >
        <Input placeholder="teacher@example.com" />
      </Form.Item>
      <Form.Item label="전화번호" name="phone">
        <Input placeholder="01012345678" />
      </Form.Item>
    </>
  );
};

export const AssociationCreate = () => {
  const { formProps, saveButtonProps } = useForm<Association>();
  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <AssociationFormFields />
      </Form>
    </Create>
  );
};

export const AssociationEdit = () => {
  const { formProps, saveButtonProps } = useForm<Association>();
  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <AssociationFormFields />
      </Form>
    </Edit>
  );
};
