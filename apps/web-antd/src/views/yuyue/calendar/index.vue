<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { YuyueCalendarApi } from '#/api/yuyue/venue-calendar';

import { Page, useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteCalendar,
  getCalendarPage,
} from '#/api/yuyue/venue-calendar';
import { $t } from '#/locales';

import { useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'YuyueCalendar' });

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

/** 刷新表格 */
function handleRefresh() {
  gridApi.query();
}

/** 新增日历配置 */
function handleCreate() {
  formModalApi.setData(null).open();
}

/** 编辑日历配置 */
function handleEdit(row: YuyueCalendarApi.Calendar) {
  formModalApi.setData(row).open();
}

/** 删除日历配置 */
async function handleDelete(row: YuyueCalendarApi.Calendar) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', ['日历配置']),
    duration: 0,
  });
  try {
    await deleteCalendar(row.id!);
    message.success($t('ui.actionMessage.deleteSuccess', ['日历配置']));
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
          return await getCalendarPage({
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
  } as VxeTableGridOptions<YuyueCalendarApi.Calendar>,
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <Grid table-title="开放日历列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: $t('ui.actionTitle.create', ['日历配置']),
              type: 'primary',
              icon: ACTION_ICON.ADD,
              auth: ['yuyue:calendar:create'],
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
              auth: ['yuyue:calendar:update'],
              onClick: handleEdit.bind(null, row),
            },
            {
              label: $t('common.delete'),
              type: 'link',
              danger: true,
              icon: ACTION_ICON.DELETE,
              auth: ['yuyue:calendar:delete'],
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', ['该日历配置']),
                confirm: handleDelete.bind(null, row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
