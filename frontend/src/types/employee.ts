export interface Employee {
  _id?: string;
  Employee_ID: string;
  Name: string;
  Department: string;
  Position: string;
  Salary?: number;
  [key: string]: any;
}

export interface EmployeeListResponse {
  success: boolean;
  data: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

