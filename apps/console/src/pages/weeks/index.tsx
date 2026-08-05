import {
  Create,
  DeleteButton,
  Edit,
  EditButton,
  List,
  useForm,
  useTable,
} from "@refinedev/antd";
import { Form, Input, InputNumber, Space, Table } from "antd";
import { InlineEditCell } from "../../components/inline-edit-cell";

type Week = {
  id: number;
  weekNo: number;
  theme: string;
  subtitle: string | null;
};

export const WeekList = () => {
  const { tableProps } = useTable<Week>({
    sorters: { initial: [{ field: "weekNo", order: "asc" }] },
  });
  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="weekNo" title="주차" sorter width={90} />
        <Table.Column<Week>
          dataIndex="theme"
          title="테마"
          sorter
          render={(_, record) => (
            <InlineEditCell
              resource="weeks"
              id={record.id}
              field="theme"
              value={record.theme}
              required
              placeholder="예: 시원한 책"
            />
          )}
        />
        <Table.Column<Week>
          dataIndex="subtitle"
          title="부제"
          render={(_, record) => (
            <InlineEditCell
              resource="weeks"
              id={record.id}
              field="subtitle"
              value={record.subtitle}
              placeholder="예: 같은 것을 다르게 느낀다"
            />
          )}
        />
        <Table.Column<Week>
          title="동작"
          width={110}
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

const WeekFormFields = () => (
  <>
    <Form.Item label="주차" name="weekNo" rules={[{ required: true }]}>
      <InputNumber min={1} />
    </Form.Item>
    <Form.Item label="테마" name="theme" rules={[{ required: true }]}>
      <Input placeholder="예: 시원한 책" />
    </Form.Item>
    <Form.Item label="부제" name="subtitle">
      <Input placeholder="예: 같은 것을 다르게 느낀다" />
    </Form.Item>
  </>
);

export const WeekCreate = () => {
  const { formProps, saveButtonProps } = useForm<Week>();
  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <WeekFormFields />
      </Form>
    </Create>
  );
};

export const WeekEdit = () => {
  const { formProps, saveButtonProps } = useForm<Week>();
  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <WeekFormFields />
      </Form>
    </Edit>
  );
};
