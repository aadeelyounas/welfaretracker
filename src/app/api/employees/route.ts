import { NextRequest, NextResponse } from 'next/server';
import { getAllEmployees, createEmployee, getEmployeesWithWelfare } from '@/lib/employee-welfare-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeWelfare = searchParams.get('includeWelfare') === 'true';
    
    if (includeWelfare) {
      const employees = await getEmployeesWithWelfare();
      return NextResponse.json(employees);
    } else {
      const employees = await getAllEmployees();
      return NextResponse.json(employees);
    }
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phoneNumber } = body;
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }
    
    const employee = await createEmployee(name.trim(), phoneNumber?.trim());
    
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
