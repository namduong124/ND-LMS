import { Request, Response } from 'express';
import * as departmentService from '../services/department.service';
import {
  CreateDepartmentInput,
  ListDepartmentsQuery,
  UpdateDepartmentInput
} from '../validators/department.validator';

export const listDepartments = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListDepartmentsQuery;
  res.json(await departmentService.listDepartments(query));
};

export const getDepartment = async (req: Request, res: Response) => {
  res.json(await departmentService.getDepartment(req.params.id as string));
};

export const createDepartment = async (req: Request, res: Response) => {
  const department = await departmentService.createDepartment(req.body as CreateDepartmentInput);
  res.status(201).json(department);
};

export const updateDepartment = async (req: Request, res: Response) => {
  res.json(await departmentService.updateDepartment(req.params.id as string, req.body as UpdateDepartmentInput));
};

export const deleteDepartment = async (req: Request, res: Response) => {
  await departmentService.deleteDepartment(req.params.id as string);
  res.status(204).end();
};
