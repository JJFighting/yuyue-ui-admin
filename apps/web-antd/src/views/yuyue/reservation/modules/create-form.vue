<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';

import type { YuyueVenueApi } from '#/api/yuyue/venue';
import type { YuyueSessionApi } from '#/api/yuyue/venue-session';

import { computed, reactive, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import FormCreate from '@form-create/ant-design-vue';
import {
  Alert,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Select,
  Spin,
  Tag,
} from 'ant-design-vue';
import dayjs, { type Dayjs } from 'dayjs';

import {
  createReservation,
  getFormPreview,
} from '#/api/yuyue/reservation';
import { getSimpleVenueList } from '#/api/yuyue/venue';
import { getRule } from '#/api/yuyue/venue-rule';
import { getAvailableSessionList } from '#/api/yuyue/venue-session';
import { setConfAndFields2 } from '#/components/form-create';

import { unbookableReasonText } from '../data';

const emit = defineEmits(['success']);

/** 表单校验规则（固定区） */
const rules = {
  headcount: [{ required: true, message: '请输入预约人数' }],
  reserveDate: [{ required: true, message: '请选择预约日期' }],
  sessionId: [{ required: true, message: '请选择场次' }],
  venueId: [{ required: true, message: '请选择场地' }],
  visitorMobile: [
    { required: true, message: '请输入访客手机号' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
  ],
  visitorName: [{ required: true, message: '请输入访客姓名' }],
};

/** 固定区表单值 */
const formState = reactive({
  headcount: 1,
  reserveDate: null as Dayjs | null,
  sessionId: undefined as number | undefined,
  venueId: undefined as number | undefined,
  visitorCompany: '',
  visitorMobile: '',
  visitorName: '',
  purpose: '',
});

const formRef = ref<FormInstance>();

/** 场地下拉选项 */
const venueOptions = ref<YuyueVenueApi.Venue[]>([]);

/** 可预约场次（含余量） */
const sessions = ref<YuyueSessionApi.SessionAvailable[]>([]);
const sessionsLoading = ref(false);

/** 最多提前预约天数（规则缺失 = 不限） */
const maxAdvanceDays = ref<null | number>(null);

/** 动态表单：none=未加载 loading=加载中 form=渲染表单 free=免审核提示 */
const formPreviewState = ref<'form' | 'free' | 'loading' | 'none'>('none');
const dynamicForm = ref<any>({});
const formCreateApi = ref<any>();

/** 场地选项 label（showSearch 过滤） */
const venueSelectOptions = computed(() =>
  venueOptions.value.map((venue) => ({ label: venue.name, value: venue.id })),
);

/** 人数超出所选场次余量时的前端提示（不强制拦截） */
const headcountHint = computed(() => {
  const selected = sessions.value.find(
    (item) => item.sessionId === formState.sessionId,
  );
  if (selected && formState.headcount > selected.remaining) {
    return `所选场次剩余名额为 ${selected.remaining}，当前人数已超出余量`;
  }
  return '';
});

/** 日期可选范围：today .. today+maxAdvanceDays（无规则时仅不可选过去） */
function disabledDate(current: Dayjs) {
  const today = dayjs().startOf('day');
  if (current.isBefore(today)) {
    return true;
  }
  return (
    maxAdvanceDays.value !== null &&
    current.isAfter(today.add(maxAdvanceDays.value, 'day'))
  );
}

/** 场次时间展示（HH:mm:ss -> HH:mm） */
function formatSessionTime(time: string) {
  return time.split(':').slice(0, 2).join(':');
}

/** 预约日期选择（清空时归一为 null） */
function handleReserveDateChange(date: Dayjs | string | undefined) {
  formState.reserveDate = (date as Dayjs | undefined) ?? null;
}

/** 加载场地规则（仅用于日期范围限制） */
async function loadRule(venueId: number) {
  maxAdvanceDays.value = null;
  const rule = await getRule(venueId).catch(() => undefined);
  maxAdvanceDays.value = rule?.maxAdvanceDays ?? null;
}

/** 加载场地动态表单预览配置 */
let previewReqId = 0;
async function loadFormPreview(venueId: number) {
  const reqId = ++previewReqId;
  formPreviewState.value = 'loading';
  try {
    const preview = await getFormPreview(venueId);
    if (reqId !== previewReqId) {
      return;
    }
    dynamicForm.value = {};
    formCreateApi.value = undefined;
    if (preview?.formConf && preview.formFields?.length) {
      setConfAndFields2(dynamicForm.value, preview.formConf, preview.formFields);
      // 在配置中禁用 form-create 自带的提交和重置按钮
      dynamicForm.value.option = {
        ...dynamicForm.value.option,
        resetBtn: false,
        submitBtn: false,
      };
      formPreviewState.value =
        dynamicForm.value.rule?.length > 0 ? 'form' : 'free';
    } else {
      formPreviewState.value = 'free';
    }
  } finally {
    if (reqId === previewReqId) {
      formPreviewState.value =
        formPreviewState.value === 'loading' ? 'none' : formPreviewState.value;
    }
  }
}

/** 加载指定场地+日期的可预约场次 */
let sessionReqId = 0;
async function loadSessions() {
  const venueId = formState.venueId;
  const reserveDate = formState.reserveDate;
  formState.sessionId = undefined;
  sessions.value = [];
  if (!venueId || !reserveDate) {
    return;
  }
  const reqId = ++sessionReqId;
  sessionsLoading.value = true;
  try {
    const list = await getAvailableSessionList(
      venueId,
      reserveDate.format('YYYY-MM-DD'),
    );
    if (reqId === sessionReqId) {
      sessions.value = list;
    }
  } finally {
    if (reqId === sessionReqId) {
      sessionsLoading.value = false;
    }
  }
}

/** 场地变化：重置日期/场次，重取规则与动态表单 */
watch(
  () => formState.venueId,
  (venueId) => {
    if (!venueId) {
      // 作废在途请求，防止慢网下回填已清空场地的数据
      previewReqId++;
      sessionReqId++;
      maxAdvanceDays.value = null;
      sessions.value = [];
      formState.sessionId = undefined;
      formState.reserveDate = null;
      formPreviewState.value = 'none';
      dynamicForm.value = {};
      formCreateApi.value = undefined;
      return;
    }
    // 换场地后原日期可能超出新的可约范围，统一重选
    formState.reserveDate = null;
    loadRule(venueId);
    loadFormPreview(venueId);
  },
);

/** 日期变化：重取场次 */
watch(
  () => formState.reserveDate,
  () => {
    loadSessions();
  },
);

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    // 扩展表单加载中不允许提交，防止绕过动态表单校验
    if (formPreviewState.value === 'loading') {
      message.warning('扩展表单加载中，请稍候');
      return;
    }
    try {
      await formRef.value?.validate();
    } catch {
      return;
    }
    // 动态表单校验（form-create 官方 validate）
    if (formPreviewState.value === 'form' && formCreateApi.value) {
      try {
        await formCreateApi.value.validate();
      } catch {
        message.warning('请完善扩展信息');
        return;
      }
    }
    modalApi.lock();
    try {
      // 动态表单取值：formCreateApi.formData()（无动态表单时提交 '{}'）
      let formData = '{}';
      if (formPreviewState.value === 'form' && formCreateApi.value) {
        formData = JSON.stringify(formCreateApi.value.formData?.() ?? {});
      }
      await createReservation({
        venueId: formState.venueId!,
        sessionId: formState.sessionId!,
        reserveDate: formState.reserveDate!.format('YYYY-MM-DD'),
        headcount: formState.headcount,
        visitorName: formState.visitorName.trim(),
        visitorCompany: formState.visitorCompany.trim() || undefined,
        visitorMobile: formState.visitorMobile.trim(),
        purpose: formState.purpose.trim() || undefined,
        formData,
      });
      await modalApi.close();
      emit('success');
      message.success('预约创建成功');
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) {
      return;
    }
    modalApi.lock();
    try {
      venueOptions.value = await getSimpleVenueList();
    } finally {
      modalApi.unlock();
    }
  },
});
</script>

<template>
  <Modal class="w-[720px]" title="新建预约">
    <Form
      ref="formRef"
      class="mx-4"
      :model="formState"
      :rules="rules"
      layout="vertical"
    >
      <div class="mb-2 font-medium">预约信息</div>
      <div class="grid grid-cols-2 gap-x-4">
        <FormItem label="场地" name="venueId">
          <Select
            v-model:value="formState.venueId"
            :options="venueSelectOptions"
            placeholder="请选择场地"
            show-search
            option-filter-prop="label"
          />
        </FormItem>
        <FormItem label="预约日期" name="reserveDate">
          <DatePicker
            :value="formState.reserveDate ?? undefined"
            class="w-full"
            placeholder="请选择预约日期"
            format="YYYY-MM-DD"
            :disabled-date="disabledDate"
            @change="handleReserveDateChange"
          />
        </FormItem>
      </div>
      <FormItem label="场次" name="sessionId">
        <div v-if="sessionsLoading" class="py-6 text-center">
          <Spin />
        </div>
        <template v-else-if="sessions.length > 0">
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="item in sessions"
              :key="item.sessionId"
              class="cursor-pointer rounded-md border border-gray-200 p-3 transition-colors"
              :class="[
                item.bookable
                  ? formState.sessionId === item.sessionId
                    ? '!border-primary bg-primary/5'
                    : 'hover:!border-primary'
                  : 'cursor-not-allowed opacity-60',
              ]"
              @click="item.bookable && (formState.sessionId = item.sessionId)"
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
          v-else-if="formState.venueId && formState.reserveDate"
          type="info"
          message="该日期暂无可预约场次"
          show-icon
        />
        <div v-else class="text-xs text-gray-400">请先选择场地与预约日期</div>
      </FormItem>

      <div class="mb-2 mt-4 font-medium">访客信息</div>
      <div class="grid grid-cols-2 gap-x-4">
        <FormItem label="姓名" name="visitorName">
          <Input
            v-model:value="formState.visitorName"
            placeholder="请输入访客姓名"
            :maxlength="64"
          />
        </FormItem>
        <FormItem label="手机号" name="visitorMobile">
          <Input
            v-model:value="formState.visitorMobile"
            placeholder="请输入访客手机号"
            :maxlength="11"
          />
        </FormItem>
        <FormItem label="单位" name="visitorCompany">
          <Input
            v-model:value="formState.visitorCompany"
            placeholder="请输入访客单位"
            :maxlength="128"
          />
        </FormItem>
        <FormItem label="人数" name="headcount">
          <InputNumber
            v-model:value="formState.headcount"
            class="w-full"
            :min="1"
            :precision="0"
            placeholder="请输入预约人数"
          />
          <div v-if="headcountHint" class="text-xs text-orange-500">
            {{ headcountHint }}
          </div>
        </FormItem>
      </div>
      <FormItem label="事由" name="purpose">
        <Input
          v-model:value="formState.purpose"
          placeholder="请输入到访事由"
          :maxlength="255"
        />
      </FormItem>

      <template v-if="formPreviewState !== 'none'">
        <div class="mb-2 mt-4 font-medium">扩展信息</div>
        <div v-if="formPreviewState === 'loading'" class="py-6 text-center">
          <Spin />
        </div>
        <FormCreate
          v-else-if="formPreviewState === 'form'"
          v-model:api="formCreateApi"
          :option="dynamicForm.option"
          :rule="dynamicForm.rule"
        />
        <Alert
          v-else
          type="info"
          message="该场地免审核，无需填写扩展信息"
          show-icon
        />
      </template>
    </Form>
  </Modal>
</template>
