import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeById, updateEmployee, deleteEmployee } from '@/lib/employee-welfare-db';
import { OptimizedWelfareDB } from '@/lib/optimized-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  
  try {
    const id = params.id;
    
    const employee = await getEmployeeById(id);
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }
    
    console.log(`GET /api/employees/${id} completed in ${Date.now() - startTime}ms`);
    
    const response = NextResponse.json(employee);
    
    // Cache for 10 minutes - individual employees don't change often
    response.headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=300');
    
    return response;
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  
  try {
    const id = params.id;
    
    const body = await request.json();
    const { name, active } = body;
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }
    
    const employee = await updateEmployee(id, {
      name: name.trim(),
      active: active !== undefined ? active : true
    });
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }
    
    // Invalidate employee and activity caches after update
    OptimizedWelfareDB.invalidateCaches('employee');
    OptimizedWelfareDB.invalidateCaches('activity');
    
    console.log(`PUT /api/employees/${id} completed in ${Date.now() - startTime}ms`);
    
    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  
  try {
    const id = params.id;
    
    const success = await deleteEmployee(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }
    
    // Invalidate all caches after employee deletion
    OptimizedWelfareDB.invalidateCaches('all');
    
    console.log(`DELETE /api/employees/${id} completed in ${Date.now() - startTime}ms`);
    
    return NextResponse.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    );
  }
}
