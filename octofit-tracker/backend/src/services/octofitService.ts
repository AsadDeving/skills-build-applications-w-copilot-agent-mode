import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

type HttpError = Error & { status: number };

function badRequest(message: string): HttpError {
  return Object.assign(new Error(message), { status: 400 });
}

function notFound(message: string): HttpError {
  return Object.assign(new Error(message), { status: 404 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw badRequest('Activity payload must be an object');
  const { userId, teamId, type, minutes } = input;
  if (typeof userId !== 'string' || typeof teamId !== 'string' || typeof type !== 'string' || !type.trim() || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw badRequest('Activity requires valid userId, teamId, type, and positive minutes');
  }
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(teamId)) {
    throw badRequest('Activity userId and teamId must be valid IDs');
  }
  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) throw notFound('Activity user or team was not found');
  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: Math.round(minutes),
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input) || typeof input.name !== 'string' || !input.name.trim()) {
    throw badRequest('Team name is required');
  }
  if (typeof input.mascot !== 'string' || !input.mascot.trim()) {
    throw badRequest('Team mascot is required');
  }
  const members = input.members ?? [];
  if (!Array.isArray(members) || !members.every((member) => typeof member === 'string' && mongoose.isValidObjectId(member))) {
    throw badRequest('Team members must be valid IDs');
  }
  if (members.length > 0) {
    const memberCount = await User.countDocuments({ _id: { $in: members } });
    if (memberCount !== new Set(members).size) throw notFound('One or more team members were not found');
  }
  const team = await Team.create({ name: input.name.trim(), mascot: input.mascot.trim(), members });
  if (members.length > 0) await User.updateMany({ _id: { $in: members } }, { $set: { team: team._id } });
  return team;
}

export async function getLeaderboard() {
  const entries = await Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number; teamName: string }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
    { $unwind: '$team' },
    { $project: { _id: 1, totalPoints: 1, teamName: '$team.name' } },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);
  return entries.map(({ teamName, totalPoints }, index) => ({ teamName, totalPoints, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw notFound('User was not found');
  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const focus = user.fitnessGoal || recentActivity?.type;
  const workouts = await Workout.find(focus ? { focus } : {}).sort({ title: 1 }).lean();
  const suggestions = workouts.length > 0 ? workouts : await Workout.find().sort({ title: 1 }).lean();
  const reason = recentActivity
    ? `Recommended for your ${focus} goal and recent ${recentActivity.type} activity.`
    : `Recommended for your ${focus} goal.`;
  return suggestions.map((workout) => ({ ...workout, reason }));
}

export { User };
