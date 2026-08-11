import { useState } from "react";
import { useUpdate } from "@refinedev/core";
import { Input, InputNumber, Select, Tooltip, Typography } from "antd";

// 리스트 셀 클릭 → 인라인 편집.
// text/number: Enter 저장, Esc·포커스 이탈 취소 / select: 선택 즉시 저장
export const InlineEditCell = ({
  resource,
  id,
  field,
  value,
  type = "text",
  options,
  required,
  placeholder,
  suffix,
}: {
  resource: string;
  id: number | string; // users는 uuid
  field: string;
  value: string | number | null;
  type?: "text" | "number" | "select";
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
  suffix?: string; // 표시용 단위 (예: "분")
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string | number | null>(null);
  const { mutate, mutation } = useUpdate();

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const commit = (next: string | number | null) => {
    if (next === (value ?? null)) {
      setEditing(false);
      return;
    }
    mutate(
      { resource, id, values: { [field]: next } },
      { onSuccess: () => setEditing(false) },
    );
  };

  const saveText = () => {
    const trimmed = String(draft ?? "").trim();
    if (required && !trimmed) return; // 필수 필드는 빈 값 저장 불가
    commit(trimmed || null);
  };

  const saveNumber = () => {
    if (required && draft == null) return;
    commit(typeof draft === "number" ? draft : null);
  };

  if (editing) {
    if (type === "select") {
      return (
        <Select
          size="small"
          autoFocus
          defaultOpen
          value={draft as string}
          options={options}
          style={{ minWidth: 110 }}
          disabled={mutation.isPending}
          onChange={(v) => commit(v)}
          onBlur={() => setEditing(false)}
        />
      );
    }
    if (type === "number") {
      return (
        <InputNumber
          size="small"
          autoFocus
          min={1}
          value={draft as number | null}
          placeholder={placeholder}
          disabled={mutation.isPending}
          onChange={(v) => setDraft(v)}
          onPressEnter={saveNumber}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          onBlur={() => setEditing(false)}
        />
      );
    }
    return (
      <Input
        size="small"
        autoFocus
        value={String(draft ?? "")}
        placeholder={placeholder}
        disabled={mutation.isPending}
        onChange={(e) => setDraft(e.target.value)}
        onPressEnter={saveText}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        onBlur={() => setEditing(false)}
      />
    );
  }

  const display =
    value == null || value === "" ? null : `${value}${suffix ?? ""}`;

  return (
    <Tooltip
      title={
        type === "select"
          ? "클릭해서 선택"
          : "클릭해서 수정 (Enter 저장, Esc 취소)"
      }
      mouseEnterDelay={0.4}
    >
      <Typography.Text
        onClick={startEdit}
        style={{ cursor: "pointer", display: "block" }}
        type={display ? undefined : "secondary"}
      >
        {display ?? "— 비어 있음"}
      </Typography.Text>
    </Tooltip>
  );
};
