/**
 * Optimized API route for employees with caching
 * Handles 1000+ employees efficiently
 */

import { NextRequest, NextResponse } from 'next/server';
import { OptimizedWelfareDB } from '@/lib/optimized-db';
import { createEmployee } from '@/lib/employee-welfare-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeWelfare = searchParams.get('includeWelfare') === 'true';
    
    if (includeWelfare) {
      // Use optimized cached version
      const employees = await OptimizedWelfareDB.getEmployeesWithWelfare();
      
      // Add cache headers for client-side caching
      const response = NextResponse.json(employees);
      response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600'); // 5min cache, 10min stale
      return response;
    } else {
      // Simple employee list (less frequent, can be cached longer)
      const employees = await OptimizedWelfareDB.getEmployeesWithWelfare();
      const simpleEmployees = employees.map(emp => ({
        id: emp.id,
        name: emp.name,
        phoneNumber: emp.phoneNumber,
        active: emp.active,
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt
      }));
      
      const response = NextResponse.json(simpleEmployees);
      response.headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200'); // 10min cache
      return response;
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
    
    // Invalidate caches when new employee is created
    OptimizedWelfareDB.invalidateCaches('employee');
    
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
