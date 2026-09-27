<script lang="ts" setup>
import type { YuyueReservationApi } from '#/api/yuyue/reservation';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { formatDateTime } from '@vben/utils';

import {
  Collapse,
  Descriptions,
  DescriptionsItem,
  Tag,
  Timeline,
  TimelineItem,
} from 'ant-design-vue';

import { getReservationDetail } from '#/api/yuyue/reservation';

import { actionText, statusColor, statusText } from '../data';

const detail = ref<YuyueReservationApi.ReservationDetail>();

/** 场次（含起止时间，HH:mm:ss -> HH:mm） */
const sessionText = computed(() => {
  const data = detail.value;
  if (!data) {
    return '-';
  }
  if (data.sessionStartTime && data.sessionEndTime) {
    const start = data.sessionStartTime.split(':').slice(0, 2).join(':');
    const end = data.sessionEndTime.split(':').slice(0, 2).join(':');
    return `${data.sessionName}（${start}-${end}）`;
  }
  return data.sessionName || '-';
});

/** 扩展表单数据（JSON 美化，解析失败回退原文） */
const formDataPretty = computed(() => {
  const raw = detail.value?.formData;
  if (!raw) {
    return '';
  }
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
});

/** 操作日志动作 -> 时间轴颜色 */
const ACTION_TIMELINE_COLOR: Record<string, string> = {
  APPROVE: 'green',
  CANCEL: 'gray',
  EXPIRE: 'gray',
  REJECT: 'red',
  REMIND: 'orange',
  RESCHEDULE: 'blue',
  SUBMIT: 'blue',
};

/** 日志的状态流转文案（from -> to） */
function logTransition(log: YuyueReservationApi.LogItem) {
  if (log.toStatus === undefined) {
    return '';
  }
  const from = log.fromStatus;
  return from === undefined
    ? statusText(log.toStatus)
    : `${statusText(from)} → ${statusText(log.toStatus)}`;
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  async onOpenChange(isOpen) {
    if (!isOpen) {
      detail.value = undefined;
      return;
    }
    const row = drawerApi.getData() as YuyueReservationApi.Reservation;
    if (!row?.id) {
      await drawerApi.close();
      return;
    }
    drawerApi.lock();
    try {
      detail.value = await getReservationDetail(row.id);
    } finally {
      drawerApi.unlock();
    }
  },
});
</script>

<template>
  <Drawer class="w-[640px]" :title="detail?.reservationNo || '预约详情'">
    <Descriptions v-if="detail" bordered :column="2" size="small">
      <DescriptionsItem label="编号" :span="2">
        {{ detail.reservationNo }}
      </DescriptionsItem>
      <DescriptionsItem label="状态">
        <Tag :color="statusColor(detail.status)">
          {{ statusText(detail.status, detail.statusName) }}
        </Tag>
      </DescriptionsItem>
      <DescriptionsItem label="人数">
        {{ detail.headcount }}
      </DescriptionsItem>
      <DescriptionsItem label="访客">
        {{ detail.visitorName }}
      </DescriptionsItem>
      <DescriptionsItem label="手机号">
        {{ detail.visitorMobile }}
      </DescriptionsItem>
      <DescriptionsItem label="单位" :span="2">
        {{ detail.visitorCompany || '-' }}
      </DescriptionsItem>
      <DescriptionsItem label="场地">
        {{ detail.venueName }}
      </DescriptionsItem>
      <DescriptionsItem label="场次">
        {{ sessionText }}
      </DescriptionsItem>
      <DescriptionsItem label="日期" :span="2">
        {{ detail.reserveDate }}
      </DescriptionsItem>
      <DescriptionsItem label="事由" :span="2">
        {{ detail.purpose || '-' }}
      </DescriptionsItem>
      <DescriptionsItem label="凭证码" :span="2">
        <template v-if="detail.voucherCode">
          <div class="font-mono text-xl font-semibold tracking-[0.3em]">
            {{ detail.voucherCode }}
          </div>
          <div class="text-xs text-gray-400">凭此码入场</div>
        </template>
        <span v-else>-</span>
      </DescriptionsItem>
      <DescriptionsItem
        v-if="detail.originalReservationId"
        label="改期原单号"
        :span="2"
      >
        {{ detail.originalReservationId }}
      </DescriptionsItem>
      <DescriptionsItem v-if="detail.cancelReason" label="取消原因" :span="2">
        {{ detail.cancelReason }}
      </DescriptionsItem>
    </Descriptions>

    <div class="mb-3 mt-5 text-base font-semibold">状态历程</div>
    <Timeline v-if="detail?.logs?.length">
      <TimelineItem
        v-for="(log, index) in detail.logs"
        :key="index"
        :color="ACTION_TIMELINE_COLOR[log.action] ?? 'blue'"
      >
        <div class="font-medium">
          {{ actionText(log.action) }}
          <span v-if="logTransition(log)" class="ml-1 font-normal">
            （{{ logTransition(log) }}）
          </span>
        </div>
        <div class="text-sm text-gray-500">
          {{ formatDateTime(log.createTime) }}
        </div>
        <div v-if="log.reason" class="mt-1 text-sm">
          原因：{{ log.reason }}
        </div>
      </TimelineItem>
    </Timeline>
    <div v-else class="py-4 text-center text-gray-400">暂无操作记录</div>

    <Collapse v-if="formDataPretty" class="mt-4">
      <Collapse.Panel key="formData" header="扩展表单数据">
        <pre class="max-w-full overflow-auto text-xs">{{ formDataPretty }}</pre>
      </Collapse.Panel>
    </Collapse>
  </Drawer>
</template>
