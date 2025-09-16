import { NextRequest, NextResponse } from 'next/server';
import { sign, verify } from 'jsonwebtoken';
import { query } from '../../../lib/employee-welfare-db';
import bcrypt from 'bcryptjs';

// Database function to get user by username
async function getUserByUsername(username: string) {
  try {
    const result = await query(
      'SELECT id, username, password, name, role, active FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user from database:', error);
    throw new Error('Database connection failed');
  }
}

export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'ashridge-welfare-tracker-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    let user;
    try {
      user = await getUserByUsername(username);
    } catch (dbError) {
      console.error('Database error during authentication:', dbError);
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 }
      );
    }

    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check password using bcrypt (handle both password_hash and password fields)
    const passwordHash = user.password_hash || user.password;
    const isValidPassword = await bcrypt.compare(password, passwordHash);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Create response with token in cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verify(token, JWT_SECRET) as any;
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        name: decoded.name,
        role: decoded.role
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Logged out' });
  
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  return response;
}
