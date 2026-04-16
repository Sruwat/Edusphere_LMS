import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Trophy, Star, Award, Crown, Target, ArrowRight } from 'lucide-react';
import gamificationImage from '../assets/Banner.jpeg';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function Achievements() {
  // Data should be fetched from API. Removed seeded/demo data.
  const userStats = { totalPoints: 0, currentRank: 0, badgesEarned: 0, weekStreak: 0 };
  const leaderboard = [];
  const achievements = [];
  const milestones = [];

  return (
    <div className="space-y-6">
      {/* Header with Gamification Image */}
      <Card>
        <CardContent className="p-0">
          <div className="relative">
            <ImageWithFallback 
              src={gamificationImage} 
              alt="Gamification Center"
              className="w-full h-48 object-cover rounded-t-lg"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent rounded-t-lg">
              <div className="p-6 text-white h-full flex flex-col justify-center">
                <h1 className="text-2xl font-bold mb-2">Gamification Center</h1>
                <p className="text-white/90">Track achievements and compete with peers</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-orange-400 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm opacity-90">Total Points</p>
                <p className="text-2xl font-bold">{userStats.totalPoints.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-pink-400 to-pink-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm opacity-90">Current Rank</p>
                <p className="text-2xl font-bold">#{userStats.currentRank}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-400 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Star className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm opacity-90">Badges Earned</p>
                <p className="text-2xl font-bold">{userStats.badgesEarned}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-400 to-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm opacity-90">Week Streak</p>
                <p className="text-2xl font-bold">{userStats.weekStreak}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Class Leaderboard
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm">Badges</Button>
              <Button variant="ghost" size="sm">Rewards</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaderboard.map((student) => (
              <div 
                key={student.rank} 
                className={`flex items-center gap-4 p-3 rounded-lg ${
                  student.rank === 1 ? 'bg-yellow-50 border-yellow-200 border' : 'bg-gray-50'
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  student.rank === 1 ? 'bg-yellow-500 text-white' :
                  student.rank === 2 ? 'bg-gray-400 text-white' :
                  student.rank === 3 ? 'bg-orange-400 text-white' : 'bg-gray-200'
                }`}>
                  {student.rank <= 3 ? (
                    <Crown className="h-4 w-4" />
                  ) : (
                    <span className="font-bold text-xs">#{student.rank}</span>
                  )}
                </div>
                <Avatar className="w-10 h-10">
                  <AvatarFallback>
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{student.name}</h4>
                  <p className="text-xs text-muted-foreground">{student.role}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{student.points.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{student.badges} badges</p>
                </div>
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-500" />
              My Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {achievements.map((achievement) => (
              <div key={achievement.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 ${achievement.color} rounded-full flex items-center justify-center`}>
                    <achievement.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm">{achievement.title}</h4>
                      {achievement.earned ? (
                        <Badge className="bg-green-100 text-green-800">Earned</Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600">In Progress</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span>{achievement.progress}%</span>
                      </div>
                      <Progress value={achievement.progress} className="h-1" />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs font-medium text-blue-600">
                        +{achievement.points} points
                      </span>
                      {achievement.date && (
                        <span className="text-xs text-muted-foreground">
                          {achievement.date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-500" />
            Learning Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {milestones.map((milestone, index) => (
              <div key={index} className="text-center">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${
                  milestone.achieved ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Trophy className="h-8 w-8" />
                </div>
                <h4 className="font-semibold text-sm">{milestone.title}</h4>
                <p className="text-xs text-muted-foreground">{milestone.points.toLocaleString()} points</p>
                <div className="mt-2">
                  {milestone.achieved ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">Achieved</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Locked</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}