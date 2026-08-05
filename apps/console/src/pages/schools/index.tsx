import { useRef, useState } from "react";
import {
  Create,
  DeleteButton,
  Edit,
  EditButton,
  List,
  Show,
  useForm,
  useTable,
} from "@refinedev/antd";
import { useList, useNavigation, useShow } from "@refinedev/core";
import {
  AutoComplete,
  Avatar,
  Col,
  Descriptions,
  Divider,
  Form,
  Image,
  Input,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { dataProvider } from "../../providers/data";
import { supabaseClient } from "../../providers/supabase-client";

type School = {
  id: number;
  name: string;
  image: string | null;
  neisCode: string | null;
  office: string | null;
  location: string | null;
  schoolType: string | null;
  zip: string | null;
  address: string | null;
  tel: string | null;
  web: string | null;
  createdAt: string;
};

type Association = {
  id: number;
  schoolId: number;
  email: string | null;
  phone: string | null;
  userId: string | null;
  userName: string | null;
  status: string;
  createdAt: string;
};

type NeisSchool = {
  code: string;
  name: string;
  office: string;
  location: string | null;
  schoolType: string | null;
  zip: string | null;
  address: string | null;
  tel: string | null;
  web: string | null;
};

// NEIS 공공 API 프록시(관리자 전용)로 초등학교 검색
async function searchNeisSchools(q: string): Promise<NeisSchool[]> {
  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(
    `${dataProvider.getApiUrl()}/api/schools/neis?q=${encodeURIComponent(q)}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
  );
  if (!res.ok) return [];
  return res.json();
}

export const SchoolList = () => {
  const { tableProps } = useTable<School>({
    sorters: { initial: [{ field: "id", order: "asc" }] },
  });
  const { show } = useNavigation();
  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column<School>
          dataIndex="image"
          title="이미지"
          width={64}
          // 이미지가 없으면 기본 학교 이미지(🏫)로 표시. 클릭 → 상세(show) 페이지
          render={(image: string | null, record) => (
            <a
              onClick={() => show("schools", record.id)}
              style={{ cursor: "pointer", display: "inline-flex" }}
              title="상세 보기"
            >
              <Avatar src={image ?? undefined}>🏫</Avatar>
            </a>
          )}
        />
        <Table.Column dataIndex="id" title="ID" sorter width={80} />
        <Table.Column
          dataIndex="neisCode"
          title="행정코드"
          render={(v) => v ?? "-"}
        />
        <Table.Column<School>
          dataIndex="name"
          title="학교명"
          sorter
          // 클릭 → 상세(show) 페이지 (인라인 수정은 제거 — 이름 수정은 Edit에서)
          render={(name: string, record) => (
            <a onClick={() => show("schools", record.id)} title="상세 보기">
              {name}
            </a>
          )}
        />
        <Table.Column dataIndex="address" title="주소" render={(v) => v ?? "-"} />
        <Table.Column
          dataIndex="schoolType"
          title="설립명"
          render={(v) => v ?? "-"}
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

export const SchoolShow = () => {
  const { query } = useShow<School>();
  const school = query.data?.data;
  // 이 학교에 연결된 강사(소속) 전부 — 많아야 5~6명 규모라 페이지네이션 없이 표시
  const { result: assocData } = useList<Association>({
    resource: "associations",
    filters: school
      ? [{ field: "schoolId", operator: "eq", value: school.id }]
      : [],
    pagination: { pageSize: 100 },
    queryOptions: { enabled: !!school },
  });
  if (!school) return null;
  return (
    <Show title={school.name}>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="ID">{school.id}</Descriptions.Item>
        <Descriptions.Item label="학교명">{school.name}</Descriptions.Item>
        <Descriptions.Item label="시도명">{school.location ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="행정표준코드">
          {school.neisCode ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="설립명">
          {school.schoolType ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="우편번호">{school.zip ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="주소" span={2}>
          {school.address ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="전화번호">{school.tel ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="홈페이지">
          {school.web ? (
            <a href={school.web.startsWith("http") ? school.web : `http://${school.web}`} target="_blank" rel="noreferrer">
              {school.web}
            </a>
          ) : (
            "-"
          )}
        </Descriptions.Item>
        <Descriptions.Item label="생성일" span={2}>
          {new Date(school.createdAt).toLocaleString("ko-KR")}
        </Descriptions.Item>
        <Descriptions.Item label="이미지" span={2}>
          {school.image ? (
            // 클릭 시 antd 기본 프리뷰(확대/회전 지원 팝업)로 크게 보기
            <Image src={school.image} style={{ maxWidth: 640, width: "100%" }} />
          ) : (
            <Avatar size={64}>🏫</Avatar>
          )}
        </Descriptions.Item>
      </Descriptions>

      <Divider />
      <Typography.Title level={5}>
        소속 강사 ({assocData?.total ?? 0}명)
      </Typography.Title>
      <Table<Association>
        dataSource={assocData?.data ?? []}
        rowKey="id"
        size="small"
        pagination={false}
      >
        <Table.Column
          dataIndex="userName"
          title="이름"
          render={(v) => v ?? "-"}
        />
        <Table.Column dataIndex="email" title="이메일" render={(v) => v ?? "-"} />
        <Table.Column dataIndex="phone" title="전화번호" render={(v) => v ?? "-"} />
        <Table.Column
          dataIndex="status"
          title="상태"
          width={100}
          render={(status: string) =>
            status === "active" ? (
              <Tag color="green">활성</Tag>
            ) : (
              <Tag color="orange">초대됨</Tag>
            )
          }
        />
        <Table.Column
          dataIndex="createdAt"
          title="등록일"
          render={(v: string) => new Date(v).toLocaleDateString("ko-KR")}
        />
      </Table>
    </Show>
  );
};

type NeisOption = { value: string; label: string; school: NeisSchool };

const SchoolFormFields = () => {
  const form = Form.useFormInstance();
  const [options, setOptions] = useState<NeisOption[]>([]);
  // 검색바는 폼 값과 무관한 로컬 입력 — 선택 결과만 폼에 채운다
  const [searchText, setSearchText] = useState("");
  const debounceRef = useRef<number>(undefined);

  // 타이핑할 때마다 400ms 디바운스로 NEIS 검색.
  // 아래 필드들은 모두 보이는 입력이므로 자동으로 비우지 않는다 — 선택 시에만 덮어쓴다.
  const handleSearch = (text: string) => {
    window.clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setOptions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      const schools = await searchNeisSchools(text.trim());
      setOptions(
        // 동명 학교가 있어 value는 고유한 NEIS 코드로 두고, 선택 시 이름으로 치환한다
        schools.map((s) => ({
          value: s.code,
          label: `${s.name} (${s.office} · ${s.address})`,
          school: s,
        }))
      );
    }, 400);
  };

  const handleSelect = (_: string, option: NeisOption) => {
    const s = option.school;
    setSearchText(s.name);
    form.setFieldsValue({
      name: s.name,
      neisCode: s.code,
      office: s.office,
      location: s.location,
      schoolType: s.schoolType,
      zip: s.zip,
      address: s.address,
      tel: s.tel,
      web: s.web,
    });
  };

  return (
    <>
      {/* 검색 전용 바 — 폼에 저장되지 않는다. 선택하면 아래 필드들이 채워진다 */}
      <Form.Item
        label="학교 검색"
        extra="NEIS에서 초등학교를 검색해 선택하면 아래 정보가 자동으로 채워집니다"
      >
        <AutoComplete
          value={searchText}
          options={options}
          onChange={setSearchText}
          onSearch={handleSearch}
          onSelect={handleSelect}
          placeholder="학교명으로 검색 (예: 늘봄초)"
          allowClear
        />
      </Form.Item>
      <Form.Item label="학교명" name="name" rules={[{ required: true }]}>
        <Input placeholder="예: 늘봄초등학교" />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="시도명" name="location">
            <Input allowClear placeholder="예: 서울특별시" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="행정표준코드" name="neisCode">
            <Input allowClear placeholder="예: 7051166" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="설립명" name="schoolType">
            <Input allowClear placeholder="예: 공립" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="우편번호" name="zip">
            <Input allowClear placeholder="예: 01364" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="주소" name="address">
        <Input allowClear placeholder="예: 서울특별시 도봉구 해등로32길 11 (방학동)" />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="전화번호" name="tel">
            <Input allowClear placeholder="예: 02-956-1561" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="홈페이지" name="web">
            <Input allowClear placeholder="예: http://chodang.sen.es.kr" />
          </Form.Item>
        </Col>
      </Row>
      {/* 교육청은 NEIS 선택 시 자동 저장 (화면에는 표시하지 않음) */}
      <Form.Item name="office" hidden>
        <Input />
      </Form.Item>
      <Form.Item
        label="이미지"
        name="image"
        extra="비워 두면 기본 학교 이미지(🏫)로 표시됩니다"
        rules={[
          {
            pattern: /^https:\/\/.+/,
            message: "https:// 로 시작하는 전체 URL이어야 해요",
          },
        ]}
      >
        <Input allowClear placeholder="https://cdn.bktk.kr/images/school.png" />
      </Form.Item>
    </>
  );
};

// allowClear로 비운 문자열("")은 null로 저장
const normalizeSchool = (values: Record<string, unknown>) => {
  const clean = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const meta = ["image", "neisCode", "office", "location", "schoolType", "zip", "address", "tel", "web"];
  return {
    ...values,
    ...Object.fromEntries(meta.map((f) => [f, clean(values[f])])),
  };
};

export const SchoolCreate = () => {
  const { formProps, saveButtonProps } = useForm<School>();
  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        onFinish={(values) => formProps.onFinish?.(normalizeSchool(values))}
      >
        <SchoolFormFields />
      </Form>
    </Create>
  );
};

export const SchoolEdit = () => {
  const { formProps, saveButtonProps } = useForm<School>();
  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        onFinish={(values) => formProps.onFinish?.(normalizeSchool(values))}
      >
        <SchoolFormFields />
      </Form>
    </Edit>
  );
};
