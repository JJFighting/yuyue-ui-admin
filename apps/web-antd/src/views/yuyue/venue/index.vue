<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { YuyueVenueApi } from '#/api/yuyue/venue';

import { Page, useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteVenue, getVenuePage } from '#/api/yuyue/venue';
import { $t } from '#/locales';

import { useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';
import RuleForm from './modules/rule-form.vue';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const [RuleFormModal, ruleFormModalApi] = useVbenModal({
  connectedComponent: RuleForm,
  destroyOnClose: true,
});

/** 刷新表格 */
function handleRefresh() {
  gridApi.query();
}

/** 创建场地 */
function handleCreate() {
  formModalApi.setData(null).open();
}

/** 编辑场地 */
function handleEdit(row: YuyueVenueApi.Venue) {
  formModalApi.setData(row).open();
}

/** 配置预约规则 */
function handleRule(row: YuyueVenueApi.Venue) {
  ruleFormModalApi.setData(row).open();
}

/** 删除场地 */
async function handleDelete(row: YuyueVenueApi.Venue) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
  });
  try {
    await deleteVenue(row.id!);
    message.success($t('ui.actionMessage.deleteSuccess', [row.name]));
    handleRefresh();
  } finally {
    hideLoading();
  }
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
          return await getVenuePage({
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
  } as VxeTableGridOptions<YuyueVenueApi.Venue>,
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <RuleFormModal />
    <Grid table-title="场地列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: $t('ui.actionTitle.create', ['场地']),
              type: 'primary',
              icon: ACTION_ICON.ADD,
              auth: ['yuyue:venue:create'],
              onClick: handleCreate,
            },
          ]"
        />
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: $t('common.edit'),
              type: 'link',
              icon: ACTION_ICON.EDIT,
              auth: ['yuyue:venue:update'],
              onClick: handleEdit.bind(null, row),
            },
            {
              label: '规则',
              type: 'link',
              icon: 'lucide:settings',
              auth: ['yuyue:rule:update'],
              onClick: handleRule.bind(null, row),
            },
            {
              label: $t('common.delete'),
              type: 'link',
              danger: true,
              icon: ACTION_ICON.DELETE,
              auth: ['yuyue:venue:delete'],
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [row.name]),
                confirm: handleDelete.bind(null, row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
