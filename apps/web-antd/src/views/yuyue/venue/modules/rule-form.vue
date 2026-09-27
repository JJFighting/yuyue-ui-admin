<script lang="ts" setup>
import type { YuyueVenueApi } from '#/api/yuyue/venue';
import type { YuyueRuleApi } from '#/api/yuyue/venue-rule';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { getRule, saveRule } from '#/api/yuyue/venue-rule';
import { $t } from '#/locales';

import { useRuleFormSchema } from '../data';

const venue = ref<YuyueVenueApi.Venue>();
const getTitle = computed(() => {
  return venue.value?.name ? `规则配置 - ${venue.value.name}` : '规则配置';
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'col-span-2',
    labelWidth: 120,
  },
  layout: 'horizontal',
  schema: useRuleFormSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    const venueId = venue.value?.id;
    if (!venueId) {
      message.warning('场地编号缺失，请重新打开规则配置');
      return;
    }
    modalApi.lock();
    // 提交：数字留空统一归一为 null（=不限/不允许/不提醒），开关归一为 boolean
    const values = (await formApi.getValues()) as YuyueRuleApi.Rule;
    try {
      await saveRule({
        venueId,
        maxAdvanceDays: values.maxAdvanceDays ?? null,
        reserveDeadlineHours: values.reserveDeadlineHours ?? null,
        cancelDeadlineHours: values.cancelDeadlineHours ?? null,
        rescheduleDeadlineHours: values.rescheduleDeadlineHours ?? null,
        rescheduleReaudit: values.rescheduleReaudit ?? false,
        remindAdvanceHours: values.remindAdvanceHours ?? null,
      });
      // 关闭并提示
      await modalApi.close();
      message.success($t('ui.actionMessage.operationSuccess'));
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      venue.value = undefined;
      return;
    }
    // 加载数据
    const data = modalApi.getData() as YuyueVenueApi.Venue;
    if (!data || !data.id) {
      return;
    }
    venue.value = data;
    modalApi.lock();
    try {
      // 未配置过规则时返回 null，表单保持全空
      const rule = await getRule(data.id);
      await formApi.setValues(rule ?? {});
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal class="w-[600px]" :title="getTitle">
    <Form class="mx-4" />
  </Modal>
</template>
