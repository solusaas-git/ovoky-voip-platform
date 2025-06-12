import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { SchedulerService } from '@/services/SchedulerService';

// GET - Get scheduler status
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduler = SchedulerService.getInstance();
    const status = await scheduler.getStatus();
    const isRunning = scheduler.isSchedulerRunning();
    const currentSettings = scheduler.getCurrentSettings();

    return NextResponse.json({ 
      success: true,
      isRunning,
      tasks: status,
      currentSchedule: currentSettings?.checkInterval ? `${currentSettings.checkInterval} minutes` : 'Not configured'
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Start/Stop scheduler or update schedule
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, schedule } = body;

    const scheduler = SchedulerService.getInstance();

    switch (action) {
      case 'start':
        if (scheduler.isSchedulerRunning()) {
          return NextResponse.json({ 
            success: false, 
            message: 'Scheduler is already running' 
          });
        }
        await scheduler.initialize();
        return NextResponse.json({ 
          success: true, 
          message: 'Scheduler started successfully',
          status: scheduler.getStatus()
        });

      case 'stop':
        scheduler.stopAll();
        return NextResponse.json({ 
          success: true, 
          message: 'Scheduler stopped successfully' 
        });

      case 'restart':
        scheduler.stopAll();
        await scheduler.initialize();
        return NextResponse.json({ 
          success: true, 
          message: 'Scheduler restarted successfully',
          status: scheduler.getStatus()
        });

      case 'update_schedule':
        if (!schedule) {
          return NextResponse.json({ 
            error: 'Schedule is required for update_schedule action' 
          }, { status: 400 });
        }
        await scheduler.updateBalanceCheckSchedule(schedule);
        return NextResponse.json({ 
          success: true, 
          message: 'Schedule updated successfully',
          newSchedule: schedule
        });

      case 'trigger_check':
        await scheduler.triggerBalanceCheck();
        return NextResponse.json({ 
          success: true, 
          message: 'Manual balance check triggered successfully' 
        });

      case 'trigger_kpi_check':
        await scheduler.triggerKpiAlertCheck();
        return NextResponse.json({ 
          success: true, 
          message: 'Manual KPI alert check triggered successfully' 
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Supported actions: start, stop, restart, update_schedule, trigger_check, trigger_kpi_check' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing scheduler:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 