import { useEffect, useState } from "react";
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
  CustomerServiceOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileZipOutlined,
  LoadingOutlined,
  PlusOutlined,
  YoutubeOutlined,
} from "@ant-design/icons";
import { unzip } from "fflate";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
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
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Progress,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
  type FormInstance,
} from "antd";
import { dataProvider } from "../../providers/data";
import { supabaseClient } from "../../providers/supabase-client";
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
  weekIndex: number; // 주차 (weeks.week_no 비정규화 — 서버가 weekId로부터 자동 유도)
  dayIndex: number; // 일차 1~5 = 월~금
  category: string;
  title: string;
  description: string | null;
  durationMin: number | null;
  image: string | null;
  lessonDownload: string | null;
  guideDownload: string | null;
  slideCount: number | null;
  flow: LessonFlow | null;
  preps: { name: string; quantity: string }[];
  media: { index: number; type: string; value: string }[];
};

type Week = { id: number; weekNo: number; theme: string };

// 자료 파일은 R2 커스텀 도메인(cdn.bktk.kr)의 full URL로 저장한다.
// 규칙 파일명의 full URL — 실제 파일은 lessons/w{주차}d{일차}/ 폴더에 올라간다
const CDN_BASE = "https://cdn.bktk.kr";
const ruleFileUrl = (prefix: string, filename: string) =>
  `${CDN_BASE}/lessons/${prefix}/${filename}`;

// presign URL을 받아 브라우저에서 R2로 직접 업로드
async function uploadToR2(key: string, file: Blob) {
  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;
  const presignRes = await fetch(`${dataProvider.getApiUrl()}/api/files/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ key }),
  });
  if (!presignRes.ok) throw new Error("업로드 URL 발급에 실패했어요");
  const { path } = (await presignRes.json()) as { path: string };
  const putRes = await fetch(`${dataProvider.getApiUrl()}${path}`, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) throw new Error("파일 업로드에 실패했어요");
}

const FILE_BOX: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 8,
};

const SLOT_EXTENSIONS: Record<"image" | "pdf", string[]> = {
  image: ["png", "jpg", "jpeg", "webp", "gif"],
  pdf: ["pdf"],
};

// 자료 파일 한 칸 — 값이 있으면 미리보기 + (X) 삭제, 없으면 R2 직접 업로드 드롭존
const FileSlot = ({
  form,
  name,
  label,
  kind,
  prefix,
  standardBase,
  placeholder,
}: {
  form: FormInstance;
  name: string;
  label: string;
  kind: "image" | "pdf";
  prefix: string | null;
  // 업로드 시 규칙 파일명의 확장자 앞부분 (예: w1d1, w1d1_lesson)
  standardBase: string | null;
  placeholder: string;
}) => {
  const value = Form.useWatch(name, form) as string | null | undefined;
  const [uploading, setUploading] = useState(false);
  const [hover, setHover] = useState(false);
  // 같은 파일명으로 재업로드해도 미리보기가 캐시를 무시하도록
  const [previewNonce, setPreviewNonce] = useState(0);

  const handleFile = async (file: File) => {
    if (!prefix || !standardBase) {
      message.warning("주차와 일차를 먼저 선택해 주세요");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!SLOT_EXTENSIONS[kind].includes(ext)) {
      message.error(
        `${SLOT_EXTENSIONS[kind].join("/")} 파일만 업로드할 수 있어요`
      );
      return;
    }
    const filename = `${standardBase}.${ext}`;
    setUploading(true);
    try {
      await uploadToR2(`lessons/${prefix}/${filename}`, file);
      form.setFieldValue(name, ruleFileUrl(prefix, filename));
      setPreviewNonce((n) => n + 1);
      message.success(`${filename} 업로드 완료`);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Form.Item label={label} style={{ marginBottom: 16 }}>
      {/* 콜 폭 = 박스 64 + 거터 패딩 8 — 박스가 패딩을 침범하지 않아야 실제 8px 간격이 산다 */}
      <Row gutter={8} align="middle" wrap={false}>
        <Col flex="72px">
          {value ? (
            // antd Upload picture-card와 같은 카드 + hover 마스크 액션(보기/삭제)
            <div
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              style={{
                ...FILE_BOX,
                position: "relative",
                overflow: "hidden",
                border: "1px solid #d9d9d9",
                background: "#fafafa",
              }}
            >
              {kind === "image" ? (
                <Image
                  key={previewNonce}
                  src={`${value}${value.includes("?") ? "&" : "?"}v=${previewNonce}`}
                  alt={`${label} 미리보기`}
                  width={62}
                  height={62}
                  preview={false}
                  style={{ objectFit: "cover" }}
                  fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='%23f0f0f0'/><text x='32' y='36' text-anchor='middle' font-size='10' fill='%23999'>파일 없음</text></svg>"
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FilePdfOutlined style={{ fontSize: 24, color: "#e5484d" }} />
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  fontSize: 15,
                  opacity: hover ? 1 : 0,
                  transition: "opacity 0.2s",
                }}
              >
                <a href={value} target="_blank" rel="noreferrer" style={{ color: "#fff" }}>
                  <EyeOutlined />
                </a>
                <Popconfirm
                  title="정말로 지울까요?"
                  okText="지우기"
                  cancelText="취소"
                  onConfirm={() => form.setFieldValue(name, null)}
                >
                  <DeleteOutlined style={{ color: "#fff", cursor: "pointer" }} />
                </Popconfirm>
              </div>
            </div>
          ) : (
            <Upload.Dragger
              accept={SLOT_EXTENSIONS[kind].map((e) => `.${e}`).join(",")}
              showUploadList={false}
              disabled={uploading}
              customRequest={({ file }) => void handleFile(file as File)}
              style={{ ...FILE_BOX, padding: 0 }}
            >
              {uploading ? (
                <LoadingOutlined style={{ fontSize: 18 }} />
              ) : (
                <div style={{ fontSize: 10, color: "#999", lineHeight: 1.4 }}>
                  여기까지
                  <br />
                  파일을 드래그 후
                  <br />
                  드롭 하세요.
                </div>
              )}
            </Upload.Dragger>
          )}
        </Col>
        <Col flex="auto">
          <Form.Item
            name={name}
            style={{ marginBottom: 0 }}
            rules={[
              {
                pattern: /^https:\/\/.+/,
                message: "https:// 로 시작하는 전체 URL이어야 해요",
              },
            ]}
          >
            <Input allowClear placeholder={placeholder} />
          </Form.Item>
        </Col>
      </Row>
    </Form.Item>
  );
};

/* ---- 슬라이드 ZIP 업로드 ----
 * zip(1.png ~ n.png) → 브라우저에서 압축 해제 → 같은 해상도의 WebP(quality 0.8)로
 * 변환 → presign으로 R2 lessons/w{주차}d{일차}/{n}.webp 업로드 → 미디어 재생목록 채움
 */
const WEBP_QUALITY = 0.8;
const UPLOAD_CONCURRENCY = 5;

function unzipAsync(bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) =>
    unzip(bytes, (err, files) => (err ? reject(err) : resolve(files)))
  );
}

// 같은 해상도의 WebP로 변환. 인코딩 미지원 브라우저(Safari)는 원본 PNG 그대로.
async function toWebp(bytes: Uint8Array): Promise<{ blob: Blob; ext: string }> {
  const png = new Blob([bytes as BlobPart], { type: "image/png" });
  try {
    const bmp = await createImageBitmap(png);
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0);
    bmp.close();
    const blob = await canvas.convertToBlob({
      type: "image/webp",
      quality: WEBP_QUALITY,
    });
    if (blob.type === "image/webp") return { blob, ext: "webp" };
  } catch {
    // 디코드/인코드 실패 시 원본 폴백
  }
  return { blob: png, ext: "png" };
}

/* ---- 재생목록 삽입 위치 선택 (공용) ---- */
type InsertPos = "first" | "last" | "after";
type MediaDraft = { type: string; value: string };

// 지정 위치에 항목들을 끼워 넣고 순번을 다시 매긴다
function insertMediaItems(
  form: FormInstance,
  items: MediaDraft[],
  pos: InsertPos,
  afterNo: number,
) {
  const current = (form.getFieldValue("media") ?? []) as MediaDraft[];
  const at =
    pos === "first"
      ? 0
      : pos === "last"
        ? current.length
        : Math.min(Math.max(afterNo, 0), current.length);
  const next = [...current];
  next.splice(at, 0, ...items);
  form.setFieldsValue({ media: next.map((m, i) => ({ ...m, index: i + 1 })) });
}

const InsertPositionPicker = ({
  count,
  onAdd,
  disabled,
}: {
  count: number; // 현재 재생목록 항목 수 ('다음에 추가' 번호 상한)
  onAdd: (pos: InsertPos, afterNo: number) => void;
  disabled?: boolean;
}) => {
  const [pos, setPos] = useState<InsertPos>("last");
  const [afterNo, setAfterNo] = useState(1);
  return (
    <Space>
      <Select
        value={pos}
        onChange={setPos}
        style={{ width: 150 }}
        options={[
          { label: "제일 앞에 추가", value: "first" },
          { label: "제일 끝에 추가", value: "last" },
          { label: "다음에 추가", value: "after" },
        ]}
      />
      {pos === "after" && (
        <InputNumber
          min={1}
          max={Math.max(count, 1)}
          value={afterNo}
          onChange={(v) => setAfterNo(v ?? 1)}
          addonAfter="번 다음"
          style={{ width: 130 }}
        />
      )}
      <Button type="primary" onClick={() => onAdd(pos, afterNo)} disabled={disabled}>
        추가
      </Button>
    </Space>
  );
};

const SlideZipUpload = ({
  form,
  prefix,
}: {
  form: FormInstance;
  prefix: string | null;
}) => {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"idle" | "working" | "done">("idle");
  const [percent, setPercent] = useState(0);
  const [stageText, setStageText] = useState("");
  const [summary, setSummary] = useState("");

  const openModal = () => {
    setStage("idle");
    setPercent(0);
    setStageText("");
    setSummary("");
    setOpen(true);
  };

  const handleZip = async (file: File) => {
    if (!prefix) return;
    setStage("working");
    setStageText("ZIP 압축 해제 중…");
    setPercent(0);
    try {
      const files = await unzipAsync(new Uint8Array(await file.arrayBuffer()));
      // 폴더 경로·__MACOSX 등 잡음을 걷어내고 {숫자}.png 만 채택
      const slides = Object.entries(files)
        .map(([path, bytes]) => {
          const base = path.split("/").pop() ?? "";
          const m = /^(\d+)\.png$/i.exec(base);
          return m && !path.startsWith("__MACOSX") && bytes.length > 0
            ? { no: Number(m[1]), bytes }
            : null;
        })
        .filter((s): s is { no: number; bytes: Uint8Array } => s !== null)
        .sort((a, b) => a.no - b.no);
      if (slides.length === 0) {
        throw new Error("ZIP에서 1.png 형식의 슬라이드를 찾지 못했어요");
      }

      // WebP 변환 + 업로드 (동시 5개)
      let done = 0;
      const results: { no: number; url: string }[] = [];
      const queue = [...slides];
      const worker = async () => {
        for (let s = queue.shift(); s; s = queue.shift()) {
          const { blob, ext } = await toWebp(s.bytes);
          const filename = `${s.no}.${ext}`;
          await uploadToR2(`lessons/${prefix}/${filename}`, blob);
          results.push({ no: s.no, url: ruleFileUrl(prefix, filename) });
          done += 1;
          setPercent(Math.round((done / slides.length) * 100));
          setStageText(`변환·업로드 중 ${done}/${slides.length}`);
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(UPLOAD_CONCURRENCY, slides.length) }, worker)
      );
      results.sort((a, b) => a.no - b.no);

      // 재생목록 채우기 — 슬라이드가 앞, 기존 비-슬라이드 항목은 뒤에 보존
      const current = (form.getFieldValue("media") ?? []) as MediaDraft[];
      const kept = current.filter((m) => m?.type && m.type !== "image");
      form.setFieldsValue({
        media: [
          ...results.map((r, i) => ({
            index: i + 1,
            type: "image",
            value: r.url,
          })),
          ...kept.map((m, i) => ({ ...m, index: results.length + i + 1 })),
        ],
        slideCount: results.length,
      });
      setSummary(
        `슬라이드 ${results.length}장 업로드 완료 — 재생목록 앞부분을 교체했어요. 저장을 눌러야 반영됩니다`
      );
      setStage("done");
    } catch (e) {
      message.error((e as Error).message);
      setStage("idle");
    }
  };

  return (
    <>
      <Button size="small" icon={<FileZipOutlined />} disabled={!prefix} onClick={openModal}>
        슬라이드 ZIP 업로드
      </Button>
      <Modal
        open={open}
        title="슬라이드 ZIP 업로드"
        footer={
          stage === "done" ? (
            <Button type="primary" onClick={() => setOpen(false)}>
              닫기
            </Button>
          ) : null
        }
        closable={stage !== "working"}
        maskClosable={false}
        onCancel={() => setOpen(false)}
      >
        {stage === "idle" && (
          <Upload.Dragger
            accept=".zip"
            showUploadList={false}
            customRequest={({ file }) => void handleZip(file as File)}
          >
            <p style={{ fontSize: 32, margin: 0 }}>
              <FileZipOutlined />
            </p>
            <p>1.png ~ n.png 가 담긴 ZIP을 드래그하거나 클릭해서 선택하세요</p>
            <Typography.Text type="secondary">
              같은 해상도의 WebP로 변환되어 lessons/{prefix}/ 에 업로드됩니다
            </Typography.Text>
          </Upload.Dragger>
        )}
        {stage === "working" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Progress percent={percent} status="active" />
            <Typography.Text type="secondary">{stageText}</Typography.Text>
          </div>
        )}
        {stage === "done" && (
          <Typography.Paragraph style={{ margin: "16px 0" }}>
            ✅ {summary}
          </Typography.Paragraph>
        )}
      </Modal>
    </>
  );
};

/* ---- 음악/영상 압축 업로드 (ffmpeg.wasm) ----
 * mp3/mp4를 브라우저 안에서 ffmpeg으로 재인코딩(mp3 128kbps / mp4 H.264 CRF 26 + AAC)
 * 후 presign으로 R2에 업로드. 코어(~31MB)는 첫 사용 시 CDN에서 받아 캐시된다.
 */
// module worker에서 로드되므로 반드시 ESM 빌드여야 한다 (umd는 importScripts 불가로 실패)
const FFMPEG_CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

let ffmpegPromise: Promise<FFmpeg> | null = null;
function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegPromise) return ffmpegPromise;
  ffmpegPromise = (async () => {
    const ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    return ffmpeg;
  })();
  // 로드 실패 시 다음 시도에서 다시 받을 수 있게 초기화
  ffmpegPromise.catch(() => {
    ffmpegPromise = null;
  });
  return ffmpegPromise;
}

const COMPRESS_ARGS: Record<"mp3" | "mp4", string[]> = {
  mp3: ["-c:a", "libmp3lame", "-b:a", "128k"],
  mp4: [
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
  ],
};

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`;

const MediaCompressUpload = ({
  form,
  prefix,
}: {
  form: FormInstance;
  prefix: string | null;
}) => {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"idle" | "working" | "done" | "error">("idle");
  const [phaseText, setPhaseText] = useState("");
  const [percent, setPercent] = useState(0);
  const [errorText, setErrorText] = useState("");
  // 압축·업로드가 끝난 결과 — done 단계에서 위치를 골라 재생목록에 추가한다
  const [result, setResult] = useState<{
    url: string;
    ext: "mp3" | "mp4";
    filename: string;
    sizeNote: string;
  } | null>(null);
  const mediaCount = ((Form.useWatch("media", form) as unknown[]) ?? []).length;

  const openModal = () => {
    setStage("idle");
    setPhaseText("");
    setPercent(0);
    setErrorText("");
    setResult(null);
    setOpen(true);
  };

  const handleFile = async (file: File) => {
    if (!prefix) return;
    const ext = file.name.split(".").pop()?.toLowerCase() as "mp3" | "mp4";
    if (ext !== "mp3" && ext !== "mp4") {
      message.error("mp3/mp4 파일만 업로드할 수 있어요");
      return;
    }
    // 파일명은 presign 규칙([A-Za-z0-9._-])에 맞게 정리 — 한글 등은 치환
    const safeBase =
      file.name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") ||
      (ext === "mp3" ? "audio" : "video");
    const filename = `${safeBase}.${ext}`;

    setStage("working");
    setPhaseText("ffmpeg 준비 중…");
    setPercent(0);
    const onProgress = ({ progress }: { progress: number }) =>
      setPercent(Math.min(100, Math.round(progress * 100)));
    // 실패 시 원인을 보여줄 수 있게 ffmpeg 로그 끝부분을 보관한다
    const logTail: string[] = [];
    const onLog = ({ message: m }: { message: string }) => {
      logTail.push(m);
      if (logTail.length > 5) logTail.shift();
    };
    let ffmpeg: FFmpeg | null = null;
    try {
      ffmpeg = await loadFFmpeg();
      ffmpeg.on("progress", onProgress);
      ffmpeg.on("log", onLog);
      setPhaseText("압축 중…");
      const inName = `in.${ext}`;
      const outName = `out.${ext}`;
      await ffmpeg.writeFile(inName, new Uint8Array(await file.arrayBuffer()));
      const code = await ffmpeg.exec(["-i", inName, ...COMPRESS_ARGS[ext], outName]);
      if (code !== 0)
        throw new Error(`ffmpeg 인코딩 실패 (exit ${code}) — ${logTail.join(" / ")}`);
      const out = (await ffmpeg.readFile(outName)) as Uint8Array;
      await ffmpeg.deleteFile(inName).catch(() => {});
      await ffmpeg.deleteFile(outName).catch(() => {});
      if (out.length === 0) throw new Error("압축 결과가 비어 있어요");

      setPhaseText("업로드 중…");
      setPercent(100);
      const blob = new Blob([out as BlobPart], {
        type: ext === "mp3" ? "audio/mpeg" : "video/mp4",
      });
      await uploadToR2(`lessons/${prefix}/${filename}`, blob);
      setResult({
        url: ruleFileUrl(prefix, filename),
        ext,
        filename,
        sizeNote: `${mb(file.size)} → ${mb(out.length)}`,
      });
      setStage("done");
    } catch (e) {
      console.error("media compress upload failed:", e);
      setErrorText((e as Error).message || String(e));
      setStage("error");
    } finally {
      ffmpeg?.off("progress", onProgress);
      ffmpeg?.off("log", onLog);
    }
  };

  const handleAdd = (pos: InsertPos, afterNo: number) => {
    if (!result) return;
    insertMediaItems(
      form,
      [
        {
          type: result.ext === "mp3" ? "music" : "video",
          value: result.url,
        },
      ],
      pos,
      afterNo
    );
    setOpen(false);
    message.success(
      `${result.ext === "mp3" ? "음악" : "영상"} 항목을 재생목록에 추가했어요 — 저장을 눌러야 반영됩니다`,
      5
    );
  };

  return (
    <>
      <Button
        size="small"
        icon={<CustomerServiceOutlined />}
        disabled={!prefix}
        onClick={openModal}
      >
        음악/영상 압축 업로드
      </Button>
      <Modal
        open={open}
        title="음악/영상 압축 업로드"
        footer={null}
        closable={stage !== "working"}
        maskClosable={false}
        onCancel={() => setOpen(false)}
      >
        {stage === "idle" && (
          <Upload.Dragger
            accept=".mp3,.mp4"
            showUploadList={false}
            customRequest={({ file }) => void handleFile(file as File)}
          >
            <p style={{ fontSize: 32, margin: 0 }}>
              <CustomerServiceOutlined />
            </p>
            <p>mp3 또는 mp4 파일을 드래그하거나 클릭해서 선택하세요</p>
            <Typography.Text type="secondary">
              mp3 128kbps / mp4 H.264+AAC 로 압축되어 lessons/{prefix}/ 에 업로드됩니다
            </Typography.Text>
          </Upload.Dragger>
        )}
        {stage === "working" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Progress percent={percent} status="active" />
            <Typography.Text type="secondary">{phaseText}</Typography.Text>
          </div>
        )}
        {stage === "done" && result && (
          <>
            <Typography.Paragraph style={{ marginTop: 16 }}>
              ✅ {result.filename} 업로드 완료 ({result.sizeNote}) — 재생목록의 어디에
              추가할까요? ({result.ext === "mp3" ? "음악" : "영상"} 항목으로 추가됩니다)
            </Typography.Paragraph>
            <InsertPositionPicker count={mediaCount} onAdd={handleAdd} />
          </>
        )}
        {stage === "error" && (
          <div style={{ padding: "16px 0" }}>
            <Typography.Paragraph type="danger" style={{ marginBottom: 16 }}>
              ⚠️ 실패했어요: {errorText}
            </Typography.Paragraph>
            <Button onClick={() => setStage("idle")}>다시 시도</Button>
          </div>
        )}
      </Modal>
    </>
  );
};

// 유튜브 링크를 재생목록에 추가하는 팝업
const YoutubeAddButton = ({ form }: { form: FormInstance }) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const mediaCount = ((Form.useWatch("media", form) as unknown[]) ?? []).length;
  const valid = /^https:\/\/.+/.test(url.trim());

  const handleAdd = (pos: InsertPos, afterNo: number) => {
    insertMediaItems(
      form,
      [{ type: "youtube", value: url.trim() }],
      pos,
      afterNo
    );
    setOpen(false);
    message.success("유튜브 항목을 재생목록에 추가했어요 — 저장을 눌러야 반영됩니다", 5);
  };

  return (
    <>
      <Button
        size="small"
        icon={<YoutubeOutlined />}
        onClick={() => {
          setUrl("");
          setOpen(true);
        }}
      >
        유튜브 링크
      </Button>
      <Modal
        open={open}
        title="유튜브 링크 추가"
        footer={null}
        maskClosable={false}
        onCancel={() => setOpen(false)}
      >
        <Form.Item
          label="유튜브 URL"
          validateStatus={url && !valid ? "error" : undefined}
          help={url && !valid ? "https:// 로 시작하는 전체 URL이어야 해요" : undefined}
          style={{ marginBottom: 16 }}
        >
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            allowClear
          />
        </Form.Item>
        <InsertPositionPicker count={mediaCount} onAdd={handleAdd} disabled={!valid} />
      </Modal>
    </>
  );
};

const DAY_LABELS = ["월", "화", "수", "목", "금"];
// 시트 규칙: 일차 ↔ 과목 고정 (1일차 책놀이 … 5일차 사회정서)
const DAY_CATEGORY = ["책놀이", "미술", "음악", "신체", "사회정서"];
const ACTIVITY_LABELS = ["활동 ①", "활동 ②", "활동 ③", "활동 ④"];
// 파일명 규칙에 맞는 값이면 주차/일차 변경 시 자동으로 갱신해도 안전하다
// (값은 full URL — 마지막 경로 조각의 파일명으로 판단)
const RULE_SHAPED = /^w\d+d\d+[._]/;
const isRuleShaped = (v: string) => RULE_SHAPED.test(v.split("/").pop() ?? "");

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
          dataIndex="image"
          title="이미지"
          width={64}
          render={(image: string | null, record) => (
            // 이미지 클릭 → 상세(show) 페이지
            <a
              onClick={() => show("lessons", record.id)}
              style={{ cursor: "pointer", display: "inline-flex" }}
              title="상세 보기"
            >
              {image ? (
                <Avatar src={image} />
              ) : (
                <Avatar>-</Avatar>
              )}
            </a>
          )}
        />
        <Table.Column dataIndex="id" title="ID" sorter width={80} />
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
                {lesson.lessonDownload ? (
                  <a href={lesson.lessonDownload}>{lesson.lessonDownload}</a>
                ) : (
                  "-"
                )}
                {lesson.guideDownload ? (
                  <a href={lesson.guideDownload}>{lesson.guideDownload}</a>
                ) : (
                  "-"
                )}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="이미지" span={2}>
              {lesson.image ? (
                <Space direction="vertical">
                  <Typography.Text copyable={{ text: lesson.image }}>
                    {lesson.image}
                  </Typography.Text>
                  {/* 클릭 시 antd 기본 프리뷰(확대/회전 지원 팝업)로 크게 보기 */}
                  <Image
                    src={lesson.image}
                    style={{ maxWidth: 640, width: "100%" }}
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
          <Typography.Title level={5}>미디어 재생목록</Typography.Title>
          <Table
            dataSource={lesson.media.map((m, i) => ({ ...m, key: i }))}
            rowKey="key"
            size="small"
            pagination={false}
          >
            <Table.Column dataIndex="index" title="순서" width={70} />
            <Table.Column
              dataIndex="type"
              title="종류"
              width={100}
              render={(type: string) => (
                <Tag>{{ image: "슬라이드", youtube: "유튜브", music: "음악", video: "영상" }[type] ?? type}</Tag>
              )}
            />
            <Table.Column
              dataIndex="value"
              title="URL/파일명"
              render={(value: string, record: { type: string }) =>
                record.type === "youtube" || value.startsWith("http") ? (
                  <a href={value} target="_blank" rel="noreferrer">
                    {value}
                  </a>
                ) : (
                  value
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
    media?: { type?: string; value?: string }[];
    description?: string | null;
    image?: string | null;
    lessonDownload?: string | null;
    guideDownload?: string | null;
  };
  // allowClear로 비운 입력("")은 null로 저장
  const fileOrNull = (f?: string | null) => (f?.trim() ? f.trim() : null);
  const step = (s?: Partial<FlowStep> | null): FlowStep | null =>
    s?.title?.trim()
      ? { title: s.title.trim(), durationMin: s.durationMin ?? 5 }
      : null;
  return {
    ...values,
    description: v.description?.trim() ? v.description.trim() : null,
    image: fileOrNull(v.image),
    lessonDownload: fileOrNull(v.lessonDownload),
    guideDownload: fileOrNull(v.guideDownload),
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
      .filter((m) => m?.value?.trim())
      .map((m, i) => {
        const type = m.type ?? "image";
        return {
          index: i + 1, // 순서대로 자동 재부여
          type,
          value: m.value!.trim(),
        };
      }),
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
    <Col flex="98px">
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
      ["image", `${prefix}.png`],
      ["lessonDownload", `${prefix}_lesson.pdf`],
      ["guideDownload", `${prefix}_guide.pdf`],
    ];
    for (const [field, standard] of rules) {
      const cur = form.getFieldValue(field) as string | undefined;
      if (!cur || isRuleShaped(cur))
        form.setFieldValue(field, ruleFileUrl(prefix, standard));
    }
  }, [prefix, form]);

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

      <Card title="자료 파일 (R2)" size="small" style={{ marginBottom: 16 }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          점선 영역에 파일을 끌어다 놓으면{" "}
          <Typography.Text code>lessons/{prefix ?? "w?d?"}/</Typography.Text> 폴더로
          바로 업로드됩니다.
        </Typography.Paragraph>
        <FileSlot
          form={form}
          name="image"
          label="이미지"
          kind="image"
          prefix={prefix}
          standardBase={prefix}
          placeholder={ruleFileUrl(prefix ?? "w1d1", `${prefix ?? "w1d1"}.png`)}
        />
        <FileSlot
          form={form}
          name="lessonDownload"
          label="수업자료 PDF (다운로드)"
          kind="pdf"
          prefix={prefix}
          standardBase={prefix ? `${prefix}_lesson` : null}
          placeholder={ruleFileUrl(prefix ?? "w1d1", `${prefix ?? "w1d1"}_lesson.pdf`)}
        />
        <FileSlot
          form={form}
          name="guideDownload"
          label="지도안 PDF (다운로드)"
          kind="pdf"
          prefix={prefix}
          standardBase={prefix ? `${prefix}_guide` : null}
          placeholder={ruleFileUrl(prefix ?? "w1d1", `${prefix ?? "w1d1"}_guide.pdf`)}
        />
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
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
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
                  <Row gutter={8}>
                    <Col flex="auto">
                      <Button
                        type="dashed"
                        block
                        icon={<PlusOutlined />}
                        onClick={() => add({ title: "", durationMin: 15 })}
                        style={{ background: "#f3f3f9" }}
                      >
                        활동 추가 ({fields.length}/4)
                      </Button>
                    </Col>
                    <Col flex="32px" />
                  </Row>
                )}
              </Space>
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
              <Row gutter={8}>
                <Col flex="auto">
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() => add({ name: "", quantity: "" })}
                    style={{ background: "#f3f3f9" }}
                  >
                    준비물 추가
                  </Button>
                </Col>
                <Col flex="32px" />
              </Row>
            </Space>
          )}
        </Form.List>
      </Card>

      <Card
        title="미디어 재생목록"
        size="small"
        style={{ marginBottom: 8 }}
        extra={
          <Space>
            <YoutubeAddButton form={form} />
            <MediaCompressUpload form={form} prefix={prefix} />
            <SlideZipUpload form={form} prefix={prefix} />
          </Space>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          슬라이드·유튜브·음악을 순서대로 섞어 구성합니다. 슬라이드는 표시 시간(초) 후
          자동으로 넘어가고, 유튜브·음악은 강사가 재생 후 직접 넘깁니다. 값은 반드시{" "}
          <Typography.Text code>https://</Typography.Text> 로 시작하는 전체 URL이어야
          합니다.
        </Typography.Paragraph>
        <Form.List name="media">
          {(fields, { add, remove, move }) => (
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {fields.map((field, i) => (
                <Row key={field.key} gutter={8} align="middle" wrap={false}>
                  <Col flex="36px">
                    <Tag style={{ width: 32, textAlign: "center" }}>{i + 1}</Tag>
                  </Col>
                  <Col flex="118px">
                    <Form.Item name={[field.name, "type"]} noStyle>
                      <Select
                        style={{ width: 110 }}
                        options={[
                          { label: "슬라이드", value: "image" },
                          { label: "유튜브", value: "youtube" },
                          { label: "음악", value: "music" },
                          { label: "영상", value: "video" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col flex="auto">
                    <Form.Item
                      noStyle
                      shouldUpdate={(prev, cur) =>
                        prev.media?.[field.name]?.type !== cur.media?.[field.name]?.type
                      }
                    >
                      {({ getFieldValue }) => {
                        const type = getFieldValue(["media", field.name, "type"]);
                        const base = `https://api.bktk.kr/api/files/lessons/${prefix ?? "w1d1"}`;
                        const placeholder =
                          type === "youtube"
                            ? "https://www.youtube.com/watch?v=..."
                            : type === "music"
                              ? `${base}/${prefix ?? "w1d1"}_audio1.mp3`
                              : `${base}/${prefix ?? "w1d1"}_slide01.png`;
                        return (
                          <Form.Item
                            name={[field.name, "value"]}
                            noStyle
                            rules={[
                              {
                                pattern: /^https:\/\//,
                                message: "https:// 로 시작하는 전체 URL을 입력하세요",
                              },
                            ]}
                          >
                            <Input placeholder={placeholder} allowClear />
                          </Form.Item>
                        );
                      }}
                    </Form.Item>
                  </Col>
                  <Col flex="96px">
                    <Space size={0}>
                      <Button
                        type="text"
                        size="small"
                        disabled={i === 0}
                        onClick={() => move(i, i - 1)}
                        title="위로"
                      >
                        ↑
                      </Button>
                      <Button
                        type="text"
                        size="small"
                        disabled={i === fields.length - 1}
                        onClick={() => move(i, i + 1)}
                        title="아래로"
                      >
                        ↓
                      </Button>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    </Space>
                  </Col>
                </Row>
              ))}
              <Row gutter={8}>
                <Col flex="auto">
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() => add({ type: "image", value: "" })}
                    style={{ background: "#f3f3f9" }}
                  >
                    항목 추가
                  </Button>
                </Col>
                <Col flex="32px" />
              </Row>
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
