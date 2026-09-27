<script lang="ts" setup>
import type { YuyueVenueApi } from '#/api/yuyue/venue';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createVenue, getVenue, updateVenue } from '#/api/yuyue/venue';
import { $t } from '#/locales';

import {
  formatManagerUserIds,
  parseManagerUserIds,
  useFormSchema,
  type VenueFormValues,
} from '../data';

const emit = defineEmits(['success']);
const formData = ref<YuyueVenueApi.Venue>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', ['场地'])
    : $t('ui.actionTitle.create', ['场地']);
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
    // 提交表单：管理员多选数组转逗号分隔串（清空传 null）
    const values = (await formApi.getValues()) as VenueFormValues;
    const data: YuyueVenueApi.Venue = {
      ...values,
      managerUserIds: formatManagerUserIds(values.managerUserIds),
      auditProcessKey: (values.auditProcessKey ?? '').trim() || null,
    };
    try {
      await (formData.value?.id ? updateVenue(data) : createVenue(data));
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
    const data = modalApi.getData() as YuyueVenueApi.Venue;
    if (!data || !data.id) {
      return;
    }
    modalApi.lock();
    try {
      formData.value = await getVenue(data.id);
      // 设置到 values：管理员逗号分隔串转多选数组
      await formApi.setValues({
        ...formData.value,
        managerUserIds: parseManagerUserIds(formData.value.managerUserIds),
      });
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
