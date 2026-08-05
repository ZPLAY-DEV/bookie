import { useEffect } from "react";
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
import { useNavigation, useShow } from "@refinedev/core";
import {
  DeleteOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  type FormInstance,
} from "antd";
import { dataProvider } from "../../providers/data";
import { InlineEditCell } from "../../components/inline-edit-cell";

type FlowStep = { title: string; durationMin: number };

type LessonFlow = {
  intro: FlowStep | null;
  activities: FlowStep[];
  wrapup: FlowStep | null;
};

type Lesson = {
  id: number;
  weekId: number;
  dayIndex: number; // 일차 1~5 = 월~금
  category: string;
  title: string;
  description: string | null;
  durationMin: number | null;
  thumbnailFile: string | null;
  lessonPdfFile: string | null;
  guidePdfFile: string | null;
  slideCount: number | null;
  flow: LessonFlow | null;
  preps: { name: string; quantity: string }[];
  media: { slideNo: number; kind: string; source: string }[];
};

type Week = { id: number; weekNo: number; theme: string };

// R2 수업 자료 URL — 파일명 규칙(w{주차}d{일차}*)에서 폴더를 유도
const lessonFileUrl = (filename: string, downloadName?: string) => {
  const folder = filename.split("_")[0].split(".")[0];
  const url = `${dataProvider.getApiUrl()}/api/files/lessons/${folder}/${filename}`;
  return downloadName ? `${url}?filename=${encodeURIComponent(downloadName)}` : url;
};

const DAY_LABELS = ["월", "화", "수", "목", "금"];
// 시트 규칙: 일차 ↔ 과목 고정 (1일차 책놀이 … 5일차 사회정서)
const DAY_CATEGORY = ["책놀이", "미술", "음악", "신체", "사회정서"];
const ACTIVITY_LABELS = ["활동 ①", "활동 ②", "활동 ③", "활동 ④"];
// 파일명 규칙에 맞는 값이면 주차/일차 변경 시 자동으로 갱신해도 안전하다
const RULE_SHAPED = /^w\d+d\d+[._]/;

const useWeekSelect = () =>
  useSelect<Week>({
    resource: "weeks",
    optionLabel: (week) => `${week.weekNo}주차 — ${week.theme}`,
    optionValue: "id",
    sorters: [{ field: "weekNo", order: "asc" }],
    pagination: { pageSize: 100 },
  });

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

export const LessonList = () => {
  const { tableProps } = useTable<Lesson>({
    sorters: { initial: [{ field: "weekId", order: "asc" }] },
  });
  const { show } = useNavigation();
  const { query: weekQuery } = useWeekSelect();
  const weekLabel = (weekId: number) => {
    const week = weekQuery.data?.data.find((w) => w.id === weekId);
    return week ? `${week.weekNo}주차` : weekId;
  };
  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column<Lesson>
          dataIndex="thumbnailFile"
          title="이미지"
          width={64}
          render={(thumbnailFile: string | null, record) => (
            // 썸네일 클릭 → 상세(show) 페이지
            <a
              onClick={() => show("lessons", record.id)}
              style={{ cursor: "pointer", display: "inline-flex" }}
              title="상세 보기"
            >
              {thumbnailFile ? (
                <Avatar src={lessonFileUrl(thumbnailFile)} />
              ) : (
                <Avatar>-</Avatar>
              )}
            </a>
          )}
        />
        <Table.Column<Lesson>
          dataIndex="weekId"
          title="주차"
          sorter
          render={(weekId: number) => weekLabel(weekId)}
        />
        <Table.Column
          dataIndex="dayIndex"
          title="일차"
          sorter
          render={(dayIndex: number) =>
            `${dayIndex}일차(${DAY_LABELS[dayIndex - 1] ?? "?"})`
          }
        />
        <Table.Column<Lesson>
          dataIndex="category"
          title="과목"
          width={110}
          render={(_, record) => (
            <InlineEditCell
              resource="lessons"
              id={record.id}
              field="category"
              value={record.category}
              type="select"
              options={DAY_CATEGORY.map((c) => ({ label: c, value: c }))}
              required
            />
          )}
        />
        <Table.Column<Lesson>
          dataIndex="title"
          title="차시명"
          render={(_, record) => (
            <InlineEditCell
              resource="lessons"
              id={record.id}
              field="title"
              value={record.title}
              required
              placeholder="차시명"
            />
          )}
        />
        <Table.Column<Lesson>
          dataIndex="durationMin"
          title="시간(분)"
          width={110}
          render={(_, record) => (
            <InlineEditCell
              resource="lessons"
              id={record.id}
              field="durationMin"
              value={record.durationMin}
              type="number"
              suffix="분"
            />
          )}
        />
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

/* ------------------------------------------------------------------ */
/* Show                                                                */
/* ------------------------------------------------------------------ */

const flowRows = (flow: Lesson["flow"]) => {
  if (!flow) return [];
  const rows: { key: string; stage: string; title: string; durationMin: number }[] = [];
  if (flow.intro) rows.push({ key: "intro", stage: "도입", ...flow.intro });
  flow.activities.forEach((step, i) =>
    rows.push({ key: `act${i}`, stage: `활동${i + 1}`, ...step }),
  );
  if (flow.wrapup) rows.push({ key: "wrapup", stage: "마무리", ...flow.wrapup });
  return rows;
};

export const LessonShow = () => {
  const { result: lesson, query } = useShow<Lesson>();
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
            <Descriptions.Item label="일차">
              {lesson.dayIndex}일차({DAY_LABELS[lesson.dayIndex - 1] ?? "?"})
            </Descriptions.Item>
            <Descriptions.Item label="과목">
              <Tag>{lesson.category}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="수업 시간">
              {lesson.durationMin != null ? `${lesson.durationMin}분` : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="차시명" span={2}>
              {lesson.title}
            </Descriptions.Item>
            <Descriptions.Item label="수업 설명" span={2}>
              {lesson.description ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="슬라이드 장수">
              {lesson.slideCount ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="파일">
              <Space direction="vertical" size={2}>
                {lesson.lessonPdfFile ? (
                  <a href={lessonFileUrl(lesson.lessonPdfFile, lesson.lessonPdfFile)}>
                    {lesson.lessonPdfFile}
                  </a>
                ) : (
                  "-"
                )}
                {lesson.guidePdfFile ? (
                  <a href={lessonFileUrl(lesson.guidePdfFile, lesson.guidePdfFile)}>
                    {lesson.guidePdfFile}
                  </a>
                ) : (
                  "-"
                )}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="썸네일" span={2}>
              {lesson.thumbnailFile ? (
                <Space direction="vertical">
                  <Typography.Text copyable={{ text: lessonFileUrl(lesson.thumbnailFile) }}>
                    {lesson.thumbnailFile}
                  </Typography.Text>
                  <Image
                    src={lessonFileUrl(lesson.thumbnailFile)}
                    style={{ maxWidth: "100%" }}
                  />
                </Space>
              ) : (
                "-"
              )}
            </Descriptions.Item>
          </Descriptions>

          <Divider />
          <Typography.Title level={5}>수업 흐름</Typography.Title>
          <Table dataSource={flowRows(lesson.flow)} rowKey="key" size="small" pagination={false}>
            <Table.Column dataIndex="stage" title="단계" width={100} />
            <Table.Column dataIndex="title" title="단계명" />
            <Table.Column
              dataIndex="durationMin"
              title="시간"
              width={100}
              render={(min: number) => `${min}분`}
            />
          </Table>

          <Divider />
          <Typography.Title level={5}>준비물</Typography.Title>
          <Table
            dataSource={lesson.preps.map((p, i) => ({ ...p, key: i }))}
            rowKey="key"
            size="small"
            pagination={false}
          >
            <Table.Column dataIndex="name" title="품목" />
            <Table.Column dataIndex="quantity" title="수량" width={140} />
          </Table>

          <Divider />
          <Typography.Title level={5}>미디어 (웹 재생 큐)</Typography.Title>
          <Table
            dataSource={lesson.media.map((m, i) => ({ ...m, key: i }))}
            rowKey="key"
            size="small"
            pagination={false}
          >
            <Table.Column dataIndex="slideNo" title="슬라이드" width={100} />
            <Table.Column
              dataIndex="kind"
              title="종류"
              width={100}
              render={(kind: string) => <Tag>{kind}</Tag>}
            />
            <Table.Column
              dataIndex="source"
              title="링크/파일명"
              render={(source: string, record: { kind: string }) =>
                record.kind === "youtube" ? (
                  <a href={source} target="_blank" rel="noreferrer">
                    {source}
                  </a>
                ) : (
                  source
                )
              }
            />
          </Table>
        </>
      )}
    </Show>
  );
};

/* ------------------------------------------------------------------ */
/* Create / Edit — 입력 편의에 집중한 구조화 폼                          */
/* ------------------------------------------------------------------ */

// 빈 단계/품목/큐를 걸러 API 스키마(flow/preps/media)에 맞게 정규화
const normalizeValues = (values: Record<string, unknown>) => {
  const v = values as {
    flow?: {
      intro?: Partial<FlowStep> | null;
      activities?: Partial<FlowStep>[];
      wrapup?: Partial<FlowStep> | null;
    } | null;
    preps?: { name?: string; quantity?: string }[];
    media?: { slideNo?: number; kind?: string; source?: string }[];
    description?: string | null;
  };
  const step = (s?: Partial<FlowStep> | null): FlowStep | null =>
    s?.title?.trim()
      ? { title: s.title.trim(), durationMin: s.durationMin ?? 5 }
      : null;
  return {
    ...values,
    description: v.description?.trim() ? v.description.trim() : null,
    flow: {
      intro: step(v.flow?.intro),
      activities: (v.flow?.activities ?? [])
        .filter((a) => a?.title?.trim())
        .slice(0, 4)
        .map((a) => ({ title: a.title!.trim(), durationMin: a.durationMin ?? 15 })),
      wrapup: step(v.flow?.wrapup),
    },
    preps: (v.preps ?? [])
      .filter((p) => p?.name?.trim())
      .map((p) => ({ name: p.name!.trim(), quantity: p.quantity?.trim() ?? "" })),
    media: (v.media ?? [])
      .filter((m) => m?.source?.trim())
      .map((m) => ({
        slideNo: m.slideNo ?? 1,
        kind: m.kind ?? "youtube",
        source: m.source!.trim(),
      })),
  };
};

// 수업 흐름 한 줄 (단계 라벨 + 단계명 + 분)
const FlowStepRow = ({
  label,
  namePath,
  onRemove,
}: {
  label: string;
  namePath: (string | number)[];
  onRemove?: () => void;
}) => (
  <Row gutter={8} align="middle" wrap={false}>
    <Col flex="72px">
      <Tag style={{ width: 64, textAlign: "center" }} color="geekblue">
        {label}
      </Tag>
    </Col>
    <Col flex="auto">
      <Form.Item name={[...namePath, "title"]} noStyle>
        <Input placeholder="단계명 (권장 18자 이내)" allowClear />
      </Form.Item>
    </Col>
    <Col flex="90px">
      <Form.Item name={[...namePath, "durationMin"]} noStyle>
        <InputNumber min={1} max={80} addonAfter="분" style={{ width: 90 }} />
      </Form.Item>
    </Col>
    <Col flex="32px">
      {onRemove ? (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={onRemove} />
      ) : (
        <span style={{ display: "inline-block", width: 32 }} />
      )}
    </Col>
  </Row>
);

const LessonForm = ({
  formProps,
  weekOptionsQuery,
}: {
  formProps: ReturnType<typeof useForm<Lesson>>["formProps"];
  weekOptionsQuery: ReturnType<typeof useWeekSelect>;
}) => {
  const form = formProps.form as FormInstance;
  const { selectProps } = weekOptionsQuery;

  const weekId = Form.useWatch("weekId", form);
  const dayIndex = Form.useWatch("dayIndex", form);
  const durationMin = Form.useWatch("durationMin", form);
  const flow = Form.useWatch("flow", form) as LessonFlow | undefined;
  const thumbnailFile = Form.useWatch("thumbnailFile", form) as string | undefined;

  const weekNo = weekOptionsQuery.query.data?.data.find((w) => w.id === weekId)?.weekNo;
  const prefix = weekNo && dayIndex ? `w${weekNo}d${dayIndex}` : null;

  // 시트 규칙: 일차가 정해지면 과목은 고정
  useEffect(() => {
    if (dayIndex) form.setFieldValue("category", DAY_CATEGORY[dayIndex - 1]);
  }, [dayIndex, form]);

  // 주차/일차가 정해지면 파일명 3종을 규칙대로 자동 채움
  // (비어 있거나 규칙 형태의 값일 때만 — 손으로 바꾼 예외 파일명은 보존)
  useEffect(() => {
    if (!prefix) return;
    const rules: Array<[string, string]> = [
      ["thumbnailFile", `${prefix}.png`],
      ["lessonPdfFile", `${prefix}_lesson.pdf`],
      ["guidePdfFile", `${prefix}_guide.pdf`],
    ];
    for (const [field, standard] of rules) {
      const cur = form.getFieldValue(field) as string | undefined;
      if (!cur || RULE_SHAPED.test(cur)) form.setFieldValue(field, standard);
    }
  }, [prefix, form]);

  const fillFileNames = () => {
    if (!prefix) return;
    form.setFieldsValue({
      thumbnailFile: `${prefix}.png`,
      lessonPdfFile: `${prefix}_lesson.pdf`,
      guidePdfFile: `${prefix}_guide.pdf`,
    });
  };

  // 검수 체크리스트: 단계 분 합계 = 수업 시간
  const flowSum =
    (flow?.intro?.durationMin ?? 0) +
    (flow?.activities ?? []).reduce((acc, a) => acc + (a?.durationMin ?? 0), 0) +
    (flow?.wrapup?.durationMin ?? 0);
  const sumMatches = durationMin != null && flowSum === durationMin;

  return (
    <Form
      {...formProps}
      layout="vertical"
      onFinish={(values) => formProps.onFinish?.(normalizeValues(values))}
    >
      <Card title="기본 정보" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={10}>
            <Form.Item label="주차" name="weekId" rules={[{ required: true }]}>
              <Select {...selectProps} placeholder="주차 선택" />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item label="일차" name="dayIndex" rules={[{ required: true }]}>
              <Select
                options={DAY_LABELS.map((label, i) => ({
                  label: `${i + 1}일차 (${label}) · ${DAY_CATEGORY[i]}`,
                  value: i + 1,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item
              label={
                <Tooltip title="일차에 따라 자동 설정됩니다 (시트 규칙: 요일↔과목 고정)">
                  과목
                </Tooltip>
              }
              name="category"
              rules={[{ required: true }]}
            >
              <Select
                disabled
                options={DAY_CATEGORY.map((c) => ({ label: c, value: c }))}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          label="차시명"
          name="title"
          rules={[{ required: true, message: "차시명을 입력해 주세요" }]}
          extra="화면 대제목·카드·표에 표시됩니다 (권장 20자 이내)"
        >
          <Input showCount placeholder="예: 『시원한 책』 같은 것을 다르게 느낀다" />
        </Form.Item>
        <Form.Item
          label="수업 설명"
          name="description"
          extra="대제목 아래 리드문 (권장 90자 이내)"
        >
          <Input.TextArea rows={2} showCount />
        </Form.Item>
        <Row gutter={16}>
          <Col span={7}>
            <Form.Item label="수업 시간(분)" name="durationMin">
              <InputNumber min={1} addonAfter="분" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item
              label="슬라이드 장수"
              name="slideCount"
              extra="웹 재생용 (인제스트 시 자동 산출)"
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card
        title="자료 파일 (R2)"
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={fillFileNames}
            disabled={!prefix}
          >
            규칙대로 자동 채우기
          </Button>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          파일명만 저장합니다. 실제 파일은{" "}
          <Typography.Text code>lessons/{prefix ?? "w?d?"}/</Typography.Text> 폴더에
          업로드되어 있어야 합니다.
        </Typography.Paragraph>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="썸네일" name="thumbnailFile">
              <Input placeholder={prefix ? `${prefix}.png` : "w1d1.png"} allowClear />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="수업자료 PDF (다운로드)" name="lessonPdfFile">
              <Input
                placeholder={prefix ? `${prefix}_lesson.pdf` : "w1d1_lesson.pdf"}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="지도안 PDF (다운로드)" name="guidePdfFile">
              <Input
                placeholder={prefix ? `${prefix}_guide.pdf` : "w1d1_guide.pdf"}
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>
        {thumbnailFile && (
          <Image
            src={lessonFileUrl(thumbnailFile)}
            alt="썸네일 미리보기"
            height={96}
            style={{ borderRadius: 8, objectFit: "cover" }}
            fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' fill='%23f0f0f0'/><text x='48' y='52' text-anchor='middle' font-size='11' fill='%23999'>파일 없음</text></svg>"
          />
        )}
      </Card>

      <Card
        title="수업 흐름"
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          <Tooltip title="검수 기준: 단계 분 합계 = 수업 시간">
            <Tag color={sumMatches ? "green" : "orange"}>
              합계 {flowSum}분 / 수업 {durationMin ?? "?"}분
            </Tag>
          </Tooltip>
        }
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <FlowStepRow label="도입" namePath={["flow", "intro"]} />
          <Form.List name={["flow", "activities"]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, i) => (
                  <FlowStepRow
                    key={field.key}
                    label={ACTIVITY_LABELS[i] ?? `활동 ${i + 1}`}
                    // Form.List 내부에서는 리스트 기준 상대 경로를 써야 한다
                    namePath={[field.name]}
                    onRemove={() => remove(field.name)}
                  />
                ))}
                {fields.length < 4 && (
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() => add({ title: "", durationMin: 15 })}
                  >
                    활동 추가 ({fields.length}/4)
                  </Button>
                )}
              </>
            )}
          </Form.List>
          <FlowStepRow label="마무리" namePath={["flow", "wrapup"]} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            단계명이 비어 있는 줄은 저장 시 제외됩니다.
          </Typography.Text>
        </Space>
      </Card>

      <Card title="준비물" size="small" style={{ marginBottom: 16 }}>
        <Form.List name="preps">
          {(fields, { add, remove }) => (
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {fields.map((field, i) => (
                <Row key={field.key} gutter={8} align="middle" wrap={false}>
                  <Col flex="32px">
                    <Tag style={{ width: 28, textAlign: "center" }}>{i + 1}</Tag>
                  </Col>
                  <Col flex="auto">
                    <Form.Item name={[field.name, "name"]} noStyle>
                      <Input placeholder="품목명 (예: 시원한 말·따뜻한 말 카드)" allowClear />
                    </Form.Item>
                  </Col>
                  <Col flex="160px">
                    <Form.Item name={[field.name, "quantity"]} noStyle>
                      <Input placeholder="수량 (예: 24세트)" allowClear />
                    </Form.Item>
                  </Col>
                  <Col flex="32px">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  </Col>
                </Row>
              ))}
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => add({ name: "", quantity: "" })}
              >
                준비물 추가
              </Button>
            </Space>
          )}
        </Form.List>
      </Card>

      <Card
        title="미디어 (웹 재생 큐)"
        size="small"
        style={{ marginBottom: 8 }}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          영상·음악이 들어간 슬라이드만 추가합니다. 유튜브는 링크, 음악·영상 파일은
          파일명(예: {prefix ?? "w1d3"}_audio1.mp3)을 입력하세요.
        </Typography.Paragraph>
        <Form.List name="media">
          {(fields, { add, remove }) => (
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {fields.map((field) => (
                <Row key={field.key} gutter={8} align="middle" wrap={false}>
                  <Col flex="130px">
                    <Form.Item name={[field.name, "slideNo"]} noStyle>
                      <InputNumber
                        min={1}
                        addonBefore="슬라이드"
                        style={{ width: 130 }}
                      />
                    </Form.Item>
                  </Col>
                  <Col flex="120px">
                    <Form.Item name={[field.name, "kind"]} noStyle>
                      <Select
                        style={{ width: 120 }}
                        options={[
                          { label: "유튜브", value: "youtube" },
                          { label: "음악", value: "audio" },
                          { label: "영상파일", value: "video" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col flex="auto">
                    <Form.Item
                      noStyle
                      shouldUpdate={(prev, cur) =>
                        prev.media?.[field.name]?.kind !== cur.media?.[field.name]?.kind
                      }
                    >
                      {({ getFieldValue }) => {
                        const kind = getFieldValue(["media", field.name, "kind"]);
                        return (
                          <Form.Item
                            name={[field.name, "source"]}
                            noStyle
                            rules={
                              kind === "youtube"
                                ? [{ type: "url", message: "유튜브 링크 형식이 아닙니다" }]
                                : []
                            }
                          >
                            <Input
                              placeholder={
                                kind === "youtube"
                                  ? "https://www.youtube.com/watch?v=..."
                                  : `${prefix ?? "w1d3"}_audio1.mp3`
                              }
                              allowClear
                            />
                          </Form.Item>
                        );
                      }}
                    </Form.Item>
                  </Col>
                  <Col flex="32px">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    />
                  </Col>
                </Row>
              ))}
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => add({ slideNo: 1, kind: "youtube", source: "" })}
              >
                미디어 추가
              </Button>
            </Space>
          )}
        </Form.List>
      </Card>
    </Form>
  );
};

// 새 수업의 기본 골격 — 시트의 표준 구성(도입 5 / 활동 15×2 / 마무리 5, 80분)
const CREATE_DEFAULTS = {
  dayIndex: 1,
  category: DAY_CATEGORY[0],
  durationMin: 80,
  flow: {
    intro: { title: "", durationMin: 5 },
    activities: [
      { title: "", durationMin: 15 },
      { title: "", durationMin: 15 },
    ],
    wrapup: { title: "", durationMin: 5 },
  },
  preps: [{ name: "", quantity: "" }],
  media: [],
};

export const LessonCreate = () => {
  const { formProps, saveButtonProps } = useForm<Lesson>();
  const weekOptionsQuery = useWeekSelect();
  return (
    <Create saveButtonProps={saveButtonProps}>
      <LessonForm
        formProps={{
          ...formProps,
          initialValues: { ...CREATE_DEFAULTS, ...formProps.initialValues },
        }}
        weekOptionsQuery={weekOptionsQuery}
      />
    </Create>
  );
};

export const LessonEdit = () => {
  const { formProps, saveButtonProps } = useForm<Lesson>();
  const weekOptionsQuery = useWeekSelect();
  return (
    <Edit saveButtonProps={saveButtonProps}>
      <LessonForm formProps={formProps} weekOptionsQuery={weekOptionsQuery} />
    </Edit>
  );
};
