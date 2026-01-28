// src/components/MemberCard.tsx
// ============================================================================
// IRON COACH - Card do Aluno com Analytics Completo
// ============================================================================

'use client';

import { motion } from 'framer-motion';

interface MemberCardProps {
  member: {
    id: string;
    name: string;
    priority: 'RED' | 'ORANGE' | 'YELLOW' | 'BLUE' | 'GREEN' | 'BLACK';
    checkInTime: string;
    tags: string[];
    helpRequested: boolean;
    status: string;
    // Novos campos de analytics
    metadata?: {
      workoutInfo?: {
        hasWorkout: boolean;
        workoutName?: string;
        workoutLetter?: string;
        frequencyPerWeek: number;
        daysSinceWorkoutCreated?: number;
        isNewWorkout: boolean;
        needsNewWorkout: boolean;
      };
      assessmentInfo?: {
        hasAssessment: boolean;
        daysSinceLastAssessment?: number;
        needsAssessment: boolean;
      };
      riskInfo?: {
        index: number;
        level: string;
        trend: string;
      };
      suggestedAction?: string;
    };
  };
  isSelected?: boolean;
  onSelect?: () => void;
  onCheckout?: () => void;
  onIntervention?: () => void;
}

const PRIORITY_CONFIG = {
  RED: { color: '#FF3B30', bg: 'rgba(255,59,48,0.15)', label: 'MÁXIMA', glow: '0 0 20px rgba(255,59,48,0.5)' },
  ORANGE: { color: '#FF9500', bg: 'rgba(255,149,0,0.15)', label: 'ALTA', glow: '0 0 15px rgba(255,149,0,0.4)' },
  YELLOW: { color: '#FFCC00', bg: 'rgba(255,204,0,0.15)', label: 'MODERADA', glow: '0 0 10px rgba(255,204,0,0.3)' },
  BLUE: { color: '#007AFF', bg: 'rgba(0,122,255,0.15)', label: 'LEVE', glow: 'none' },
  GREEN: { color: '#30D158', bg: 'rgba(48,209,88,0.15)', label: 'AUTÔNOMO', glow: 'none' },
  BLACK: { color: '#8E8E93', bg: 'rgba(142,142,147,0.15)', label: 'VIP', glow: 'none' },
};

const RISK_CONFIG = {
  LOW: { color: '#30D158', bg: 'rgba(48,209,88,0.2)', icon: '✅', label: 'OK' },
  MEDIUM: { color: '#FFCC00', bg: 'rgba(255,204,0,0.2)', icon: '⚠️', label: 'ATENÇÃO' },
  HIGH: { color: '#FF9500', bg: 'rgba(255,149,0,0.2)', icon: '🔶', label: 'RISCO' },
  CRITICAL: { color: '#FF3B30', bg: 'rgba(255,59,48,0.2)', icon: '🚨', label: 'CRÍTICO' },
};

export default function MemberCard({
  member,
  isSelected,
  onSelect,
  onCheckout,
  onIntervention,
}: MemberCardProps) {
  const priority = PRIORITY_CONFIG[member.priority];
  const metadata = member.metadata;
  const riskLevel = metadata?.riskInfo?.level as keyof typeof RISK_CONFIG;
  const risk = riskLevel ? RISK_CONFIG[riskLevel] : null;
  
  const waitMinutes = Math.floor((Date.now() - new Date(member.checkInTime).getTime()) / 60000);
  const formatWait = (m: number) => m < 1 ? 'Agora' : m < 60 ? `${m}min` : `${Math.floor(m / 60)}h${m % 60}m`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="relative rounded-2xl overflow-hidden cursor-pointer transition-all"
      style={{
        backgroundColor: priority.bg,
        border: `2px solid ${isSelected ? priority.color : 'transparent'}`,
        boxShadow: isSelected ? priority.glow : 'none',
      }}
    >
      {/* Help Requested Indicator */}
      {member.helpRequested && (
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: '#FF3B30' }}
        />
      )}

      {/* Main Content */}
      <div className="p-4">
        {/* Header Row */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {/* Priority Badge */}
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: priority.color }}
              />
              {/* Name */}
              <h3 className="font-bold text-white text-lg truncate">
                {member.name.split(' ').slice(0, 2).join(' ')}
              </h3>
              {/* Help Icon */}
              {member.helpRequested && <span className="text-red-500">🆘</span>}
            </div>
            
            {/* Workout Info */}
            {metadata?.workoutInfo && (
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                {metadata.workoutInfo.hasWorkout ? (
                  <>
                    <span>🏋️ Treino {metadata.workoutInfo.workoutLetter}</span>
                    <span>•</span>
                    <span>{metadata.workoutInfo.frequencyPerWeek}x/sem</span>
                    {metadata.workoutInfo.daysSinceWorkoutCreated !== undefined && (
                      <>
                        <span>•</span>
                        <span>📅 {metadata.workoutInfo.daysSinceWorkoutCreated}d</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-yellow-500">⚠️ Sem ficha de treino</span>
                )}
              </div>
            )}
          </div>

          {/* Wait Time */}
          <div className="text-right">
            <span className="text-white font-mono text-lg">⏱️ {formatWait(waitMinutes)}</span>
          </div>
        </div>

        {/* Analytics Row */}
        <div className="flex gap-2 mb-3">
          {/* Risk Badge */}
          {risk && metadata?.riskInfo && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: risk.bg, color: risk.color }}
            >
              <span>{risk.icon}</span>
              <span>IRD {metadata.riskInfo.index}%</span>
              {metadata.riskInfo.trend === 'declining' && <span>↓</span>}
              {metadata.riskInfo.trend === 'improving' && <span>↑</span>}
            </div>
          )}

          {/* Assessment Badge */}
          {metadata?.assessmentInfo && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: metadata.assessmentInfo.needsAssessment 
                  ? 'rgba(255,149,0,0.2)' 
                  : 'rgba(48,209,88,0.2)',
                color: metadata.assessmentInfo.needsAssessment ? '#FF9500' : '#30D158',
              }}
            >
              📋 {metadata.assessmentInfo.hasAssessment 
                ? `Aval: ${metadata.assessmentInfo.daysSinceLastAssessment}d`
                : 'Sem avaliação'}
            </div>
          )}
        </div>

        {/* Tags */}
        {member.tags && member.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {member.tags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: tag.includes('↓') || tag.includes('SEM') 
                    ? '#FF9500' 
                    : tag.includes('NOVA') 
                      ? '#30D158' 
                      : '#FFFFFF80',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Suggested Action */}
        {metadata?.suggestedAction && (
          <div className="bg-black/20 rounded-lg p-2 mb-3">
            <p className="text-xs text-gray-400">
              💡 <span className="text-white">{metadata.suggestedAction}</span>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onIntervention?.(); }}
            className="flex-1 py-2 rounded-xl font-bold text-sm transition-colors"
            style={{
              backgroundColor: priority.color,
              color: member.priority === 'YELLOW' ? '#000' : '#FFF',
            }}
          >
            ⚡ Intervenção
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCheckout?.(); }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium text-sm text-white transition-colors"
          >
            👋
          </button>
        </div>
      </div>
    </motion.div>
  );
}