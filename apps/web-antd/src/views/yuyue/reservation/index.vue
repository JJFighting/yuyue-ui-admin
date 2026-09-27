<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { YuyueSessionApi } from '#/api/yuyue/venue-session';

import { reactive, ref, watch } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';

import {
  Alert,
  DatePicker,
  Form,
  FormItem,
  message,
  Modal,
  Spin,
  Switch,
  Tag,
  Textarea,
} from 'ant-design-vue';
import dayjs, { type Dayjs } from 'dayjs';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  cancelReservation,
  getReservationPage,
  rescheduleReservation,
  YuyueReservationApi,
} from '#/api/yuyue/reservation';
import { getRule } from '#/api/yuyue/venue-rule';
import { getAvailableSessionList } from '#/api/yuyue/venue-session';
import { $t } from '#/locales';

import { unbookableReasonText, useGridColumns, useGridFormSchema } from './data';
import CreateForm from './modules/create-form.vue';
import Detail from './modules/detail.vue';

const { StatusEnum } = YuyueReservationApi;

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: CreateForm,
  destroyOnClose: true,
});

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: Detail,
  destroyOnClose: true,
});

/** 刷新表格 */
function handleRefresh() {
  gridApi.query();
}

/** 新建预约（代预约） */
function handleCreate() {
  formModalApi.setData(null).open();
}

/** 查看详情 */
function handleDetail(row: YuyueReservationApi.Reservation) {
  detailDrawerApi.setData(row).open();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getReservationPage({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions<YuyueReservationApi.Reservation>,
});

/** ==================== 取消预约 ==================== */

const cancelVisible = ref(false);
const cancelLoading = ref(false);
const cancelRow = ref<YuyueReservationApi.Reservation>();
const cancelFormRef = ref<FormInstance>();
const cancelState = reactive({
  force: false,
  reason: '',
});
const cancelRules = {
  reason: [{ required: true, message: '请填写取消原因' }],
};

/** 打开取消弹窗 */
function handleCancel(row: YuyueReservationApi.Reservation) {
  cancelRow.value = row;
  cancelState.reason = '';
  cancelState.force = false;
  cancelVisible.value = true;
}

/** 确认取消 */
async function confirmCancel() {
  try {
    await cancelFormRef.value?.validate();
  } catch {
    return;
  }
  cancelLoading.value = true;
  try {
    await cancelReservation({
      id: cancelRow.value!.id,
      reason: cancelState.reason.trim(),
      force: cancelState.force,
    });
    cancelVisible.value = false;
    message.success('预约已取消');
    handleRefresh();
  } finally {
    cancelLoading.value = false;
  }
}

/** ==================== 改期预约 ==================== */

const rescheduleVisible = ref(false);
const rescheduleSubmitting = ref(false);
const rescheduleLoading = ref(false);
const rescheduleRow = ref<YuyueReservationApi.Reservation>();
const rescheduleDate = ref<Dayjs | null>(null);
const rescheduleSessionId = ref<null | number>(null);
const rescheduleSessions = ref<YuyueSessionApi.SessionAvailable[]>([]);
/** 目标日期可选上限（规则缺失 = 不限） */
const rescheduleMaxAdvanceDays = ref<null | number>(null);

/** 打开改期弹窗 */
function handleReschedule(row: YuyueReservationApi.Reservation) {
  rescheduleRow.value = row;
  rescheduleDate.value = null;
  rescheduleSessionId.value = null;
  rescheduleSessions.value = [];
  rescheduleMaxAdvanceDays.value = null;
  rescheduleVisible.value = true;
  // 仅用于目标日期的可选范围
  getRule(row.venueId)
    .then((rule) => {
      rescheduleMaxAdvanceDays.value = rule?.maxAdvanceDays ?? null;
    })
    .catch(() => {
      rescheduleMaxAdvanceDays.value = null;
    });
}

/** 目标日期可选范围：today .. today+maxAdvanceDays（无规则时仅不可选过去） */
function disabledRescheduleDate(current: Dayjs) {
  const today = dayjs().startOf('day');
  if (current.isBefore(today)) {
    return true;
  }
  return (
    rescheduleMaxAdvanceDays.value !== null &&
    current.isAfter(today.add(rescheduleMaxAdvanceDays.value, 'day'))
  );
}

/** 加载目标日期的可预约场次 */
let rescheduleReqId = 0;
async function loadRescheduleSessions() {
  const row = rescheduleRow.value;
  const date = rescheduleDate.value;
  rescheduleSessionId.value = null;
  rescheduleSessions.value = [];
  if (!row || !date) {
    return;
  }
  const reqId = ++rescheduleReqId;
  rescheduleLoading.value = true;
  try {
    const list = await getAvailableSessionList(
      row.venueId,
      date.format('YYYY-MM-DD'),
    );
    if (reqId === rescheduleReqId) {
      rescheduleSessions.value = list;
    }
  } finally {
    if (reqId === rescheduleReqId) {
      rescheduleLoading.value = false;
    }
  }
}

watch(rescheduleDate, () => {
  loadRescheduleSessions();
});

/** 场次时间展示（HH:mm:ss -> HH:mm） */
function formatSessionTime(time: string) {
  return time.split(':').slice(0, 2).join(':');
}

/** 目标日期选择（清空时归一为 null） */
function handleRescheduleDateChange(date: Dayjs | string | undefined) {
  rescheduleDate.value = (date as Dayjs | undefined) ?? null;
}

/** 确认改期 */
async function confirmReschedule() {
  if (!rescheduleDate.value || !rescheduleSessionId.value) {
    message.warning('请选择目标日期与场次');
    return;
  }
  rescheduleSubmitting.value = true;
  try {
    await rescheduleReservation({
      id: rescheduleRow.value!.id,
      reserveDate: rescheduleDate.value.format('YYYY-MM-DD'),
      sessionId: rescheduleSessionId.value,
    });
    rescheduleVisible.value = false;
    message.success('改期成功，原单已关闭并生成新预约单');
    handleRefresh();
  } finally {
    rescheduleSubmitting.value = false;
  }
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <DetailDrawer />

    <Grid table-title="预约列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '新建预约',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              auth: ['yuyue:reservation:create'],
              onClick: handleCreate,
            },
          ]"
        />
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: $t('common.detail'),
              type: 'link',
              icon: ACTION_ICON.VIEW,
              auth: ['yuyue:reservation:query'],
              onClick: handleDetail.bind(null, row),
            },
            {
              label: '取消',
              type: 'link',
              danger: true,
              icon: ACTION_ICON.CLOSE,
              auth: ['yuyue:reservation:cancel'],
              ifShow: (
                [StatusEnum.PENDING, StatusEnum.CONFIRMED] as number[]
              ).includes(row.status),
              onClick: handleCancel.bind(null, row),
            },
            {
              label: '改期',
              type: 'link',
              icon: 'lucide:calendar-clock',
              auth: ['yuyue:reservation:reschedule'],
              ifShow: row.status === StatusEnum.CONFIRMED,
              onClick: handleReschedule.bind(null, row),
            },
          ]"
        />
      </template>
    </Grid>

    <!-- 取消预约弹窗 -->
    <Modal
      v-model:open="cancelVisible"
      :title="`取消预约 - ${cancelRow?.reservationNo ?? ''}`"
      :confirm-loading="cancelLoading"
      @ok="confirmCancel"
    >
      <Form
        ref="cancelFormRef"
        class="mx-2 mt-4"
        :model="cancelState"
        :rules="cancelRules"
        layout="vertical"
      >
        <FormItem label="取消原因" name="reason">
          <Textarea
            v-model:value="cancelState.reason"
            placeholder="请填写取消原因"
            :rows="3"
            :maxlength="255"
            show-count
          />
        </FormItem>
        <FormItem name="force">
          <div class="flex items-center gap-2">
            <Switch v-model:checked="cancelState.force" />
            <span>跳过取消截止校验（管理员）</span>
          </div>
        </FormItem>
      </Form>
    </Modal>

    <!-- 改期预约弹窗 -->
    <Modal
      v-model:open="rescheduleVisible"
      :title="`改期预约 - ${rescheduleRow?.reservationNo ?? ''}`"
      width="640px"
      :confirm-loading="rescheduleSubmitting"
      @ok="confirmReschedule"
    >
      <div class="mx-2 mt-4">
        <div class="mb-2 text-sm">
          目标日期
          <span class="text-red-500">*</span>
        </div>
        <DatePicker
          :value="rescheduleDate ?? undefined"
          class="w-full"
          placeholder="请选择目标日期"
          format="YYYY-MM-DD"
          :disabled-date="disabledRescheduleDate"
          @change="handleRescheduleDateChange"
        />
        <div class="mb-2 mt-4 text-sm">
          目标场次
          <span class="text-red-500">*</span>
        </div>
        <div v-if="rescheduleLoading" class="py-6 text-center">
          <Spin />
        </div>
        <template v-else-if="rescheduleSessions.length > 0">
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="item in rescheduleSessions"
              :key="item.sessionId"
              class="cursor-pointer rounded-md border border-gray-200 p-3 transition-colors"
              :class="[
                item.bookable
                  ? rescheduleSessionId === item.sessionId
                    ? '!border-primary bg-primary/5'
                    : 'hover:!border-primary'
                  : 'cursor-not-allowed opacity-60',
              ]"
              @click="item.bookable && (rescheduleSessionId = item.sessionId)"
            >
              <div class="flex items-center justify-between">
                <span class="font-medium">{{ item.name }}</span>
                <Tag v-if="!item.bookable" color="default">
                  {{ unbookableReasonText(item.reason) }}
                </Tag>
              </div>
              <div class="mt-1 text-xs text-gray-500">
                {{ formatSessionTime(item.startTime) }} -
                {{ formatSessionTime(item.endTime) }}
              </div>
              <div class="mt-1 text-xs">
                剩余名额：{{ item.remaining }}/{{ item.capacity }}
              </div>
            </div>
          </div>
        </template>
        <Alert
          v-else-if="rescheduleDate"
          type="info"
          message="该日期暂无可预约场次"
          show-icon
        />
        <div v-else class="text-xs text-gray-400">请先选择目标日期</div>
      </div>
    </Modal>
  </Page>
</template>
