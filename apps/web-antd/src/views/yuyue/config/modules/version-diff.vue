<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { YuyueConfigApi } from '#/api/yuyue/config';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Table, Tag } from 'ant-design-vue';

import { getVersionDiff } from '#/api/yuyue/config';

defineOptions({ name: 'YuyueConfigVersionDiff' });

const diff = ref<YuyueConfigApi.ProcessVersionDiff>();

/** 字段变更类型 -> Tag 颜色/文案 */
const CHANGE_TAG: Record<
  YuyueConfigApi.FieldDiff['change'],
  { color: string; text: string }
> = {
  ADDED: { color: 'green', text: '新增' },
  REMOVED: { color: 'red', text: '删除' },
  TYPE_CHANGED: { color: 'orange', text: '类型变更' },
};

const columns: TableColumnsType = [
  { dataIndex: 'field', title: '字段', key: 'field' },
  { dataIndex: 'change', title: '变更', key: 'change', width: 150 },
  { dataIndex: 'detail', title: '明细', key: 'detail' },
];

/** 变更类型 -> Tag 颜色/文案（未知类型兜底：显示原码 + 默认灰 Tag） */
function changeTag(change: string): { color?: string; text: string } {
  const known = CHANGE_TAG[change as YuyueConfigApi.FieldDiff['change']];
  return known
    ? { color: known.color, text: `${change}（${known.text}）` }
    : { text: change };
}

/** JSON 美化（解析失败回退原文；空值给占位提示） */
function prettyJson(raw?: null | string) {
  if (!raw) {
    return '（无模型数据）';
  }
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

const fromModelPretty = computed(() => prettyJson(diff.value?.fromSimpleModel));
const toModelPretty = computed(() => prettyJson(diff.value?.toSimpleModel));

const title = computed(() =>
  diff.value
    ? `版本对比 v${diff.value.fromVersion} → v${diff.value.toVersion}`
    : '版本对比',
);

const [Modal, modalApi] = useVbenModal({
  footer: false,
  async onOpenChange(isOpen) {
    if (!isOpen) {
      diff.value = undefined;
      return;
    }
    const data = modalApi.getData() as { from?: string; to?: string };
    if (!data?.from || !data?.to) {
      await modalApi.close();
      return;
    }
    modalApi.lock();
    try {
      diff.value = await getVersionDiff(data.from, data.to);
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal class="w-[900px]" :title="title">
    <div v-if="diff">
      <!-- 表单字段差异 -->
      <div class="mb-2 font-semibold">表单字段差异</div>
      <Table
        :columns="columns"
        :data-source="diff.fieldDiffs"
        :locale="{ emptyText: '表单字段无差异' }"
        :pagination="false"
        row-key="field"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'change'">
            <Tag :color="changeTag(record.change).color">
              {{ changeTag(record.change).text }}
            </Tag>
          </template>
        </template>
      </Table>

      <!-- 流程模型差异 -->
      <div class="mb-2 mt-4 font-semibold">流程模型差异</div>
      <div v-if="diff.simpleModelChanged" class="grid grid-cols-2 gap-3">
        <div class="min-w-0">
          <div class="mb-1 text-sm text-gray-400">
            基准版本 v{{ diff.fromVersion }}
          </div>
          <pre
            v-text="fromModelPretty"
            class="max-h-[420px] max-w-full overflow-auto rounded bg-gray-50 p-3 text-xs dark:bg-gray-900"
          ></pre>
        </div>
        <div class="min-w-0">
          <div class="mb-1 text-sm text-gray-400">
            目标版本 v{{ diff.toVersion }}
          </div>
          <pre
            v-text="toModelPretty"
            class="max-h-[420px] max-w-full overflow-auto rounded bg-gray-50 p-3 text-xs dark:bg-gray-900"
          ></pre>
        </div>
      </div>
      <div v-else class="py-4 text-center text-gray-400">流程模型无差异</div>
    </div>
  </Modal>
</template>
