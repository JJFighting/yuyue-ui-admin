<script lang="ts" setup>
import type { YuyueCalendarApi } from '#/api/yuyue/venue-calendar';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createCalendar,
  getCalendar,
  updateCalendar,
} from '#/api/yuyue/venue-calendar';
import { $t } from '#/locales';

import { normalizeCalendarValues, useFormSchema } from '../data';

const emit = defineEmits(['success']);
const formData = ref<YuyueCalendarApi.Calendar>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', ['开放日历'])
    : $t('ui.actionTitle.create', ['开放日历']);
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'col-span-2',
    labelWidth: 100,
  },
  layout: 'horizontal',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    // 提交：按类型归一条件字段（每周规则 open 恒 true、weekday/calDate 互斥）
    const values = (await formApi.getValues()) as YuyueCalendarApi.Calendar;
    const data = normalizeCalendarValues(values);
    try {
      await (formData.value?.id ? updateCalendar(data) : createCalendar(data));
      // 关闭并提示
      await modalApi.close();
      emit('success');
      message.success($t('ui.actionMessage.operationSuccess'));
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      formData.value = undefined;
      return;
    }
    // 加载数据
    const data = modalApi.getData() as YuyueCalendarApi.Calendar;
    if (!data || !data.id) {
      return;
    }
    modalApi.lock();
    try {
      formData.value = await getCalendar(data.id);
      await formApi.setValues(formData.value);
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
