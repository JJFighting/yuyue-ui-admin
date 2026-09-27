<script lang="ts" setup>
import type { BpmModelApi } from '#/api/bpm/model';
import type { YuyueConfigApi } from '#/api/yuyue/config';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Alert, message, Select, Tag } from 'ant-design-vue';

import { getForm } from '#/api/bpm/form';
import { getModel, getModelList } from '#/api/bpm/model';
import { checkForm } from '#/api/yuyue/config';

defineOptions({ name: 'YuyueConfigCheck' });

const modelOptions = ref<{ label: string; value: string }[]>([]);
const models = ref<BpmModelApi.Model[]>([]);
const modelsLoading = ref(false);
const modelKey = ref<string>();
/** 传入的流程 key 未匹配到流程模型时提示手动选择 */
const keyMismatch = ref(false);

const result = ref<YuyueConfigApi.FormCheckResult>();

/** 问题级别 -> Tag 颜色 */
const LEVEL_TAG: Record<YuyueConfigApi.FormCheckIssue['level'], string> = {
  ERROR: 'red',
  INFO: 'blue',
  WARNING: 'orange',
};

const [Modal, modalApi] = useVbenModal({
  confirmText: '开始检查',
  async onConfirm() {
    await runCheck();
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      modelOptions.value = [];
      models.value = [];
      modelKey.value = undefined;
      keyMismatch.value = false;
      result.value = undefined;
      return;
    }
    const data = modalApi.getData() as { processKey?: string };
    result.value = undefined;
    await loadModels(data?.processKey);
  },
});

/** 加载流程模型选项（预选传入的流程 key；未匹配到时提示手动选择） */
async function loadModels(processKey?: string) {
  modelsLoading.value = true;
  try {
    models.value = await getModelList();
    modelOptions.value = models.value.map((item) => ({
      label: `${item.name}（${item.key}）`,
      value: item.key,
    }));
    const matched = processKey
      ? models.value.some((item) => item.key === processKey)
      : false;
    keyMismatch.value = !!processKey && !matched;
    modelKey.value = matched ? processKey : undefined;
  } finally {
    modelsLoading.value = false;
  }
}

/** simpleModel 草稿序列化（对象形态 → JSON 串；空草稿返回 undefined，仅检查表单） */
function serializeSimpleModel(model: BpmModelApi.Model) {
  return model.simpleModel ? JSON.stringify(model.simpleModel) : undefined;
}

/** 拉取模型/表单草稿并执行发布检查 */
async function runCheck() {
  const key = modelKey.value;
  if (!key) {
    message.warning('请选择流程模型');
    return;
  }
  modalApi.lock();
  try {
    // 1. 定位模型（列表不含草稿，需按 id 取详情）
    const matched = models.value.find((item) => item.key === key);
    if (!matched?.id) {
      message.warning(`未找到流程 key 为 ${key} 的流程模型`);
      return;
    }
    // 2. 模型草稿（simpleModel）+ 关联表单草稿（fields）
    const model = await getModel(String(matched.id));
    let formFields: string[] | undefined;
    if (model.formId) {
      formFields = (await getForm(model.formId)).fields;
    } else {
      message.warning('该模型未关联流程表单，仅检查流程模型');
    }
    // 3. 发布检查
    result.value = await checkForm({
      formFields,
      processDefinitionKey: key,
      simpleModel: serializeSimpleModel(model),
    });
  } finally {
    modalApi.unlock();
  }
}
</script>

<template>
  <Modal class="w-[720px]" title="发布检查">
    <div class="mb-3 flex items-center gap-3">
      <span class="font-medium">流程模型</span>
      <Select
        v-model:value="modelKey"
        :options="modelOptions"
        :loading="modelsLoading"
        :disabled="!modelsLoading && modelOptions.length === 0"
        placeholder="请选择流程模型"
        show-search
        option-filter-prop="label"
        class="w-96"
        @change="result = undefined"
      />
    </div>
    <div class="mb-4 text-xs text-gray-400">
      使用 BPM 设计器中的草稿（流程模型 + 关联表单）执行发布前检查：必采字段、字段兼容、流程完整性
      <br />
      请先在设计器保存草稿（未保存的修改不参与检查）
    </div>
    <Alert
      v-if="keyMismatch"
      class="mb-4"
      type="warning"
      show-icon
      message="当前流程 key 未匹配到流程模型，请手动选择"
    />

    <template v-if="result">
      <div class="mb-3 flex items-center gap-2">
        <Tag :color="result.passed ? 'green' : 'red'">
          <span class="text-base font-semibold">
            {{ result.passed ? '检查通过' : '检查未通过' }}
          </span>
        </Tag>
        <span class="text-sm text-gray-400">
          共 {{ result.issues.length }} 个问题项
        </span>
      </div>
      <ul v-if="result.issues.length > 0" class="space-y-2">
        <li
          v-for="(issue, index) in result.issues"
          :key="index"
          class="flex items-start gap-2"
        >
          <Tag :color="LEVEL_TAG[issue.level]">{{ issue.level }}</Tag>
          <span class="text-gray-400">{{ issue.scope }}</span>
          <span>{{ issue.message }}</span>
        </li>
      </ul>
      <div v-else class="py-4 text-center text-gray-400">无问题项</div>
    </template>
  </Modal>
</template>
