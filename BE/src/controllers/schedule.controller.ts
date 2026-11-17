import { Request, Response } from 'express';
import * as scheduleService from '../services/schedule.service';
import { CreateScheduleInput, UpdateScheduleInput } from '../validators/schedule.validator';

const actorOf = (req: Request) => ({
  id: req.user!.sub,
  role: req.user?.role || ''
});

export const createSchedule = async (req: Request, res: Response) => {
  const schedule = await scheduleService.createSchedule(req.body as CreateScheduleInput);
  res.status(201).json({
    message: 'Thêm ca học thành công',
    data: schedule
  });
};

export const updateSchedule = async (req: Request, res: Response) => {
  const schedule = await scheduleService.updateSchedule(
    req.params.id as string,
    req.body as UpdateScheduleInput
  );
  res.json({
    message: 'Cập nhật ca học thành công',
    data: schedule
  });
};

export const deleteSchedule = async (req: Request, res: Response) => {
  await scheduleService.deleteSchedule(req.params.id as string);
  res.json({
    message: 'Đã xóa ca học thành công'
  });
};

export const getClassSchedules = async (req: Request, res: Response) => {
  const schedules = await scheduleService.getSchedulesByClass(req.params.classId as string);
  res.json({
    data: schedules
  });
};

export const getMyTimetable = async (req: Request, res: Response) => {
  const actor = actorOf(req);
  const timetable = await scheduleService.getMyTimetable(actor);
  res.json({
    data: timetable
  });
};
