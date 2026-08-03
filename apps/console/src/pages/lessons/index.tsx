import {
  Create,
  DeleteButton,
  Edit,
  EditButton,
  List,
  Show,
  ShowButton,
  useForm,
  useSelect,
  useTable,
} from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import {
  Descriptions,
  Divider,
  Form,
  Image,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { dataProvider } from "../../providers/data";

type Lesson = {
  id: number;
  weekId: number;
  weekday: number;
  category: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  durationMin: number | null;
};

type LessonDetail = Lesson & {
  steps: { id: number; sortOrder: number; title: string; durationMin: number }[];
  preps: { id: number; name: string; quantity: string | null }[];
  materials: { id: number; kind: string; fileName: string; storagePath: string }[];
};

type Week = { id: number; weekNo: number; theme: string };

// R2(media 버킷) 오브젝트 URL — api의 /api/files/* 라우트가 서빙한다
const fileUrl = (key: string, filename?: string) => {
  const url = `${dataProvider.getApiUrl()}/api/files/${key}`;
  return filename ? `${url}?filename=${encodeURIComponent(filename)}` : url;
};

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금"];
const CATEGORIES = ["책놀이", "미술", "음악", "신체", "사회정서"];

const useWeekSelect = () =>
  useSelect<Week>({
    resource: "weeks",
    optionLabel: (week) => `${week.weekNo}주차 — ${week.theme}`,
    optionValue: "id",
    sorters: [{ field: "weekNo", order: "asc" }],
    pagination: { pageSize: 100 },
  });

export const LessonList = () => {
  const { tableProps } = useTable<Lesson>({
    sorters: { initial: [{ field: "weekId", order: "asc" }] },
  });
  const { query: weekQuery } = useWeekSelect();
  const weekLabel = (weekId: number) => {
    const week = weekQuery.data?.data.find((w) => w.id === weekId);
    return week ? `${week.weekNo}주차` : weekId;
  };
  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column<Lesson>
          dataIndex="weekId"
          title="주차"
          sorter
          render={(weekId: number) => weekLabel(weekId)}
        />
        <Table.Column
          dataIndex="weekday"
          title="요일"
          sorter
          render={(weekday: number) => WEEKDAY_LABELS[weekday - 1] ?? weekday}
        />
        <Table.Column dataIndex="category" title="카테고리" />
        <Table.Column dataIndex="title" title="제목" />
        <Table.Column dataIndex="durationMin" title="시간(분)" />
        <Table.Column<Lesson>
          title="동작"
          render={(_, record) => (
            <Space>
              <ShowButton hideText size="small" recordItemId={record.id} />
              <EditButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};

const LessonFormFields = () => {
  const { selectProps } = useWeekSelect();
  return (
    <>
      <Form.Item label="주차" name="weekId" rules={[{ required: true }]}>
        <Select {...selectProps} />
      </Form.Item>
      <Form.Item label="요일" name="weekday" rules={[{ required: true }]}>
        <Select
          options={WEEKDAY_LABELS.map((label, i) => ({
            label,
            value: i + 1,
          }))}
        />
      </Form.Item>
      <Form.Item label="카테고리" name="category" rules={[{ required: true }]}>
        <Select options={CATEGORIES.map((c) => ({ label: c, value: c }))} />
      </Form.Item>
      <Form.Item label="제목" name="title" rules={[{ required: true }]}>
        <Input placeholder="예: 시원한 말, 따듯한 말" />
      </Form.Item>
      <Form.Item label="설명" name="description">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item label="이미지 키 (R2)" name="imageUrl">
        <Input placeholder="예: images/lessons/w1-fri.png" />
      </Form.Item>
      <Form.Item label="수업 시간(분)" name="durationMin">
        <InputNumber min={1} />
      </Form.Item>
    </>
  );
};

const MATERIAL_KIND_LABELS: Record<string, string> = {
  guide: "지도안",
  resource: "수업자료",
};

export const LessonShow = () => {
  const { result: lesson, query } = useShow<LessonDetail>();
  const { query: weekQuery } = useWeekSelect();
  const week = weekQuery.data?.data.find((w) => w.id === lesson?.weekId);

  return (
    <Show isLoading={query.isLoading}>
      {lesson && (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="주차">
              {week ? `${week.weekNo}주차 — ${week.theme}` : lesson.weekId}
            </Descriptions.Item>
            <Descriptions.Item label="요일">
              {WEEKDAY_LABELS[lesson.weekday - 1] ?? lesson.weekday}
            </Descriptions.Item>
            <Descriptions.Item label="카테고리">
              <Tag>{lesson.category}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="수업 시간">
              {lesson.durationMin != null ? `${lesson.durationMin}분` : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="제목" span={2}>
              {lesson.title}
            </Descriptions.Item>
            <Descriptions.Item label="설명" span={2}>
              {lesson.description ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="이미지" span={2}>
              {lesson.imageUrl ? (
                <Image src={fileUrl(lesson.imageUrl)} width={240} />
              ) : (
                "-"
              )}
            </Descriptions.Item>
          </Descriptions>

          <Divider />
          <Typography.Title level={5}>수업 흐름</Typography.Title>
          <Table
            dataSource={lesson.steps}
            rowKey="id"
            size="small"
            pagination={false}
          >
            <Table.Column dataIndex="sortOrder" title="순서" width={80} />
            <Table.Column dataIndex="title" title="단계" />
            <Table.Column
              dataIndex="durationMin"
              title="시간"
              width={100}
              render={(min: number) => `${min}분`}
            />
          </Table>

          <Divider />
          <Typography.Title level={5}>수업 전 준비</Typography.Title>
          <Table
            dataSource={lesson.preps}
            rowKey="id"
            size="small"
            pagination={false}
          >
            <Table.Column dataIndex="name" title="준비물" />
            <Table.Column dataIndex="quantity" title="수량" width={120} />
          </Table>

          <Divider />
          <Typography.Title level={5}>자료</Typography.Title>
          <Table
            dataSource={lesson.materials}
            rowKey="id"
            size="small"
            pagination={false}
          >
            <Table.Column
              dataIndex="kind"
              title="종류"
              width={120}
              render={(kind: string) => MATERIAL_KIND_LABELS[kind] ?? kind}
            />
            <Table.Column<LessonDetail["materials"][number]>
              dataIndex="fileName"
              title="파일"
              render={(fileName: string, record) => (
                <a href={fileUrl(record.storagePath, fileName)}>{fileName}</a>
              )}
            />
          </Table>
        </>
      )}
    </Show>
  );
};

export const LessonCreate = () => {
  const { formProps, saveButtonProps } = useForm<Lesson>();
  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <LessonFormFields />
      </Form>
    </Create>
  );
};

export const LessonEdit = () => {
  const { formProps, saveButtonProps } = useForm<Lesson>();
  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <LessonFormFields />
      </Form>
    </Edit>
  );
};
