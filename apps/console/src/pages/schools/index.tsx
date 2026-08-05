import {
  Create,
  DeleteButton,
  Edit,
  EditButton,
  List,
  useForm,
  useTable,
} from "@refinedev/antd";
import { Form, Input, Space, Table } from "antd";
import { InlineEditCell } from "../../components/inline-edit-cell";

type School = {
  id: number;
  name: string;
  createdAt: string;
};

export const SchoolList = () => {
  const { tableProps } = useTable<School>({
    sorters: { initial: [{ field: "id", order: "asc" }] },
  });
  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title="ID" sorter width={80} />
        <Table.Column<School>
          dataIndex="name"
          title="학교 이름"
          sorter
          render={(_, record) => (
            <InlineEditCell
              resource="schools"
              id={record.id}
              field="name"
              value={record.name}
              required
              placeholder="예: 늘봄초등학교"
            />
          )}
        />
        <Table.Column<School>
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

const SchoolFormFields = () => (
  <Form.Item label="학교 이름" name="name" rules={[{ required: true }]}>
    <Input placeholder="예: 늘봄초등학교" />
  </Form.Item>
);

export const SchoolCreate = () => {
  const { formProps, saveButtonProps } = useForm<School>();
  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <SchoolFormFields />
      </Form>
    </Create>
  );
};

export const SchoolEdit = () => {
  const { formProps, saveButtonProps } = useForm<School>();
  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <SchoolFormFields />
      </Form>
    </Edit>
  );
};
