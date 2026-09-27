<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { YuyueConfigApi } from '#/api/yuyue/config';

import { computed, onMounted, ref } from 'vue';

import { useAccess } from '@vben/access';
import { confirm, Page, useVbenModal } from '@vben/common-ui';
import { formatDateTime } from '@vben/utils';

import { Button, message, Select, Table, Tag } from 'ant-design-vue';

import { getVersionList, rollbackVersion } from '#/api/yuyue/config';
import { getSimpleVenueList } from '#/api/yuyue/venue';

import CheckModal from './modules/check-modal.vue';
import VersionDiff from './modules/version-diff.vue';

defineOptions({ name: 'YuyueConfig' });

const { hasAccessByCodes } = useAccess();

/** 流程 key 选项（场地汇总 auditProcessKey 去重） */
const processKeyOptions = ref<{ label: string; value: string }[]>([]);
const keysLoading = ref(false);
const processKey = ref<string>();

const versions = ref<YuyueConfigApi.ProcessVersion[]>([]);
const tableLoading = ref(false);

/** 版本对比双选（来源/目标的流程定义编号） */
const fromId = ref<string>();
const toId = ref<string>();

const versionOptions = computed(() =>
  versions.value.map((item) => ({
    label: `v${item.version}（${formatDateTime(item.deploymentTime)}）`,
    value: item.processDefinitionId,
  })),
);

/** 两个版本均选中且不相同时才可对比 */
const canDiff = computed(
  () => !!fromId.value && !!toId.value && fromId.value !== toId.value,
);

/** 流程 key 下拉的占位/禁用态（区分加载中与无数据） */
const keyPlaceholder = computed(() => {
  if (keysLoading.value) {
    return '加载中...';
  }
  return processKeyOptions.value.length === 0
    ? '暂无场地绑定审核流程'
    : '请选择流程 key';
});

/**
 * 当前生效版本：后端 /list 按版本号降序返回（见 YuyueProcessVersionController
 * "版本列表（按版本号降序）"），首行即最新部署版本，也是新预约走的版本。
 */
const currentVersionId = computed(() => versions.value[0]?.processDefinitionId);

const columns: TableColumnsType = [
  { dataIndex: 'version', title: '版本号', key: 'version', width: 120 },
  {
    dataIndex: 'deploymentTime',
    title: '发布时间',
    key: 'deploymentTime',
  },
  { title: '操作', key: 'action', width: 120 },
];

const [CheckFormModal, checkModalApi] = useVbenModal({
  connectedComponent: CheckModal,
  destroyOnClose: true,
});

const [DiffModal, diffModalApi] = useVbenModal({
  connectedComponent: VersionDiff,
  destroyOnClose: true,
});

/** 加载流程 key 选项并默认选中第一个 */
async function loadProcessKeys() {
  keysLoading.value = true;
  try {
    const venues = await getSimpleVenueList();
    const keys = [
      ...new Set(
        venues
          .map((venue) => venue.auditProcessKey)
          .filter((key): key is string => !!key),
      ),
    ];
    processKeyOptions.value = keys.map((key) => ({ label: key, value: key }));
    processKey.value = keys[0];
    await loadVersions();
  } finally {
    keysLoading.value = false;
  }
}

/** 加载当前流程 key 的版本列表 */
async function loadVersions() {
  const key = processKey.value;
  fromId.value = undefined;
  toId.value = undefined;
  versions.value = [];
  if (!key) {
    return;
  }
  tableLoading.value = true;
  try {
    versions.value = await getVersionList(key);
  } finally {
    tableLoading.value = false;
  }
}

/** 版本对比 */
function handleDiff() {
  if (!canDiff.value) {
    return;
  }
  diffModalApi.setData({ from: fromId.value, to: toId.value }).open();
}

/** 回退版本（revert 方式生成新版本，历史版本保留） */
async function handleRollback(row: YuyueConfigApi.ProcessVersion) {
  try {
    await confirm(
      `确认回退到 v${row.version} 吗？将以 revert 方式生成新版本（内容=旧版），历史版本保留。` +
        '回退将立即重新部署并生效于新预约，当前设计器草稿会被覆盖为该版本内容。',
      { icon: 'warning' },
    );
  } catch {
    return; // 取消回退
  }
  const hideLoading = message.loading({ content: '回退中...', duration: 0 });
  try {
    await rollbackVersion(row.processDefinitionId);
    message.success(`已回退到 v${row.version}（生成新版本）`);
    await loadVersions();
  } finally {
    hideLoading();
  }
}

/** 发布检查 */
function handleCheck() {
  checkModalApi.setData({ processKey: processKey.value }).open();
}

onMounted(loadProcessKeys);
</script>

<template>
  <Page auto-content-height>
    <CheckFormModal />
    <DiffModal />
    <div class="bg-card h-full overflow-auto rounded-lg p-4">
      <!-- 顶部：流程 key 选择 + 发布检查 -->
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <span class="font-medium">审核流程</span>
        <Select
          v-model:value="processKey"
          :options="processKeyOptions"
          :loading="keysLoading"
          :disabled="!keysLoading && processKeyOptions.length === 0"
          :placeholder="keyPlaceholder"
          class="w-72"
          @change="loadVersions"
        />
        <Button
          v-if="hasAccessByCodes(['yuyue:config:check'])"
          type="primary"
          :disabled="!processKey"
          @click="handleCheck"
        >
          发布检查
        </Button>
      </div>

      <!-- 版本对比：来源/目标双选 -->
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <span class="font-medium">版本对比</span>
        <Select
          v-model:value="fromId"
          :options="versionOptions"
          :disabled="versions.length === 0"
          allow-clear
          placeholder="来源版本"
          class="w-64"
        />
        <span class="text-gray-400">→</span>
        <Select
          v-model:value="toId"
          :options="versionOptions"
          :disabled="versions.length === 0"
          allow-clear
          placeholder="目标版本"
          class="w-64"
        />
        <Button :disabled="!canDiff" @click="handleDiff">对比</Button>
      </div>

      <Table
        :columns="columns"
        :data-source="versions"
        :loading="tableLoading"
        :pagination="false"
        row-key="processDefinitionId"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'version'">
            <span class="mr-2">v{{ record.version }}</span>
            <!-- 首行=版本号降序的最新部署版，即当前生效版本 -->
            <Tag
              v-if="record.processDefinitionId === currentVersionId"
              color="blue"
            >
              当前版本
            </Tag>
          </template>
          <template v-else-if="column.key === 'deploymentTime'">
            {{ formatDateTime(record.deploymentTime) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <Button
              v-if="hasAccessByCodes(['yuyue:config:rollback'])"
              type="link"
              size="small"
              danger
              :disabled="record.processDefinitionId === currentVersionId"
              @click="
                handleRollback(record as YuyueConfigApi.ProcessVersion)
              "
            >
              回退
            </Button>
            <span v-else>-</span>
          </template>
        </template>
      </Table>
    </div>
  </Page>
</template>
