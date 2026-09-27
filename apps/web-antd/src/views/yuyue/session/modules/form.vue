<script lang="ts" setup>
import type { YuyueSessionApi } from '#/api/yuyue/venue-session';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createSession,
  getSession,
  updateSession,
} from '#/api/yuyue/venue-session';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits(['success']);
const formData = ref<YuyueSessionApi.Session>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', ['场次'])
    : $t('ui.actionTitle.create', ['场次']);
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
    // 提交表单（startTime/endTime 为 HH:mm:ss 字符串）
    const data = (await formApi.getValues()) as YuyueSessionApi.Session;
    try {
      await (formData.value?.id ? updateSession(data) : createSession(data));
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
    const data = modalApi.getData() as YuyueSessionApi.Session;
    if (!data || !data.id) {
      return;
    }
    modalApi.lock();
    try {
      formData.value = await getSession(data.id);
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
