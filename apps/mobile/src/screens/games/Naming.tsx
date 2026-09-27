import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { surfaceCard, theme } from '@/theme/index';
import { GameHeader } from '@/components/games/GameHeader';
import { HintButton } from '@/components/games/HintButton';
import { EncouragementBanner } from '@/components/games/EncouragementBanner';
import { InstructionCard } from '@/components/games/InstructionCard';
import { InstructionBanner } from '@/components/games/InstructionBanner';
import { HowToPlayButton } from '@/components/games/HowToPlayButton';
import { StarRating } from '@/components/games/StarRating';
import { BigButton } from '@/components/games/BigButton';
import {
  NamingOptionButton,
  NamingOptionState,
} from '@/components/games/naming/NamingOptionButton';
import {
  NAMING_CARD_POOL,
  NAMING_LEVEL_CONFIG,
  NAMING_ITEMS_PER_SESSION,
  NAMING_MAX_HINTS,
} from '@/data/namingData';
import { shuffle } from '@/utils/shuffle';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { useTranslation } from '@/i18n';
import { scoreToStars } from '@/utils/difficulty';
import {
  randomFrom,
} from '@/utils/encouragement';
import type { StarRating as StarRatingValue } from '@/utils/types';
import { ScreenLayout } from '@/components/ScreenLayout';

interface Round {
  emoji: string;
  correctLabel: string;
  options: string[];
}

function buildRounds(optionCount: number, count: number): Round[] {
  const pool = shuffle(NAMING_CARD_POOL);
  const rounds: Round[] = [];

  for (let i = 0; i < count; i++) {
    const target = pool[i % pool.length];
    const distractorPool = shuffle(
      NAMING_CARD_POOL.filter((item) => item.label !== target.label)
    ).slice(0, optionCount - 1);
    const options = shuffle([target.label, ...distractorPool.map((d) => d.label)]);
    rounds.push({ emoji: target.emoji, correctLabel: target.label, options });
  }

  return rounds;
}

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

export function NameItScreen() {
  const navigation = useNavigation();
  const { t, translations } = useTranslation();
  const patientId = useAuthStore((state) => state.patientId);

  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState(1);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [eliminatedLabel, setEliminatedLabel] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [hintsRemaining, setHintsRemaining] = useState(NAMING_MAX_HINTS);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [encouragementTone, setEncouragementTone] = useState<'gentle' | 'celebration'>(
    'gentle'
  );
  const [sessionComplete, setSessionComplete] = useState(false);
  const [resultStars, setResultStars] = useState<StarRatingValue | null>(null);
  const [nextLevel, setNextLevel] = useState<number | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  const hintsUsedRef = useRef(0);
  const startTimeRef = useRef(0);

  function getStartingLevel(): Promise<number> {
    return useGameStore.getState().startLevelFor(patientId, 'object_recognition');
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const startingLevel = await getStartingLevel();

      if (cancelled) return;
      const config = NAMING_LEVEL_CONFIG[startingLevel] ?? NAMING_LEVEL_CONFIG[1];
      setLevel(startingLevel);
      setRounds(buildRounds(config.optionCount, NAMING_ITEMS_PER_SESSION));
      startTimeRef.current = Date.now();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  function finishSession(finalCorrect: number) {
    const durationMs = Date.now() - startTimeRef.current;
    const accuracy = finalCorrect / NAMING_ITEMS_PER_SESSION;
    const stars = scoreToStars(accuracy, hintsUsedRef.current);
    setResultStars(stars);
    setSessionComplete(true);

    // Saved on-device and queued for the server in one step; the modal
    // does not wait for either.
    useGameStore
      .getState()
      .finishSession({
        patientId,
        gameType: 'object_recognition',
        accuracy,
        hintsUsed: hintsUsedRef.current,
        durationMs,
        level,
      })
      .then((result) => setNextLevel(result.nextLevel))
      .catch((error) => {
        console.warn('Failed to save naming game session', error);
      });
  }

  function goToNextRound(updatedCorrectCount: number) {
    const next = roundIndex + 1;
    if (next >= rounds.length) {
      finishSession(updatedCorrectCount);
      return;
    }
    setRoundIndex(next);
    setAnswerState('unanswered');
    setSelectedLabel(null);
    setEliminatedLabel(null);
  }

  function handleOptionPress(label: string) {
    if (answerState !== 'unanswered') return;
    const current = rounds[roundIndex];
    setSelectedLabel(label);

    if (label === current.correctLabel) {
      setAnswerState('correct');
      setEncouragementTone('celebration');
      setEncouragement(randomFrom(translations.gameFeedback.celebration));
      const updated = correctCount + 1;
      setCorrectCount(updated);
      setTimeout(() => goToNextRound(updated), 900);
    } else {
      setAnswerState('incorrect');
      setEncouragementTone('gentle');
      setEncouragement(randomFrom(translations.gameFeedback.gentleRetry));
      setTimeout(() => goToNextRound(correctCount), 1400);
    }
  }

  function handleHint() {
    if (hintsRemaining <= 0 || answerState !== 'unanswered') return;
    const current = rounds[roundIndex];
    const wrongOptions = current.options.filter(
      (opt) => opt !== current.correctLabel && opt !== eliminatedLabel
    );
    if (wrongOptions.length === 0) return;

    hintsUsedRef.current += 1;
    setHintsRemaining((r) => r - 1);
    setEliminatedLabel(randomFrom(wrongOptions));
  }

  async function startNewSession() {
    const atLevel = await getStartingLevel();
    const config = NAMING_LEVEL_CONFIG[atLevel] ?? NAMING_LEVEL_CONFIG[1];
    setLevel(atLevel);
    setRounds(buildRounds(config.optionCount, NAMING_ITEMS_PER_SESSION));
    setRoundIndex(0);
    setAnswerState('unanswered');
    setSelectedLabel(null);
    setEliminatedLabel(null);
    setCorrectCount(0);
    setHintsRemaining(NAMING_MAX_HINTS);
    setEncouragement(null);
    setSessionComplete(false);
    setResultStars(null);
    setNextLevel(null);
    setShowInstructions(true);
    hintsUsedRef.current = 0;
    startTimeRef.current = Date.now();
  }

  if (loading || rounds.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <GameHeader title={`${t('gameUi.level')} ${level}`} color={theme.colors.tileProgress} onBack={() => navigation.goBack()} />
        <View style={styles.centerFill}>
          <InstructionCard
            message={t('gameUi.namingInstructions')}
            color={theme.colors.tileProgress}
          />
        </View>
      </SafeAreaView>
    );
  }

  const current = rounds[roundIndex];
  const sessionEndMessage = resultStars
    ? randomFrom(
        resultStars === 1
          ? translations.gameFeedback.oneStar
          : resultStars === 2
            ? translations.gameFeedback.twoStars
            : translations.gameFeedback.threeStars
      )
    : '';

  function optionState(label: string): NamingOptionState {
    if (label === eliminatedLabel) return 'eliminated';
    if (answerState === 'unanswered') return 'default';
    if (label === current.correctLabel) {
      return answerState === 'correct' && label === selectedLabel ? 'correct' : 'revealed';
    }
    if (label === selectedLabel && answerState === 'incorrect') return 'incorrect';
    return 'default';
  }

  return (
    <ScreenLayout scrollable={false}>
      <GameHeader
        title={`${t('gameUi.level')} ${level}`}
        color={theme.colors.tileProgress}
        onBack={() => navigation.goBack()}
        progress={{ current: roundIndex + 1, total: rounds.length }}
        rightSlot={
          <Text style={styles.progressText}>
            {roundIndex + 1}/{rounds.length}
          </Text>
        }
      />

      <InstructionBanner
        visible={showInstructions}
        message={t('gameUi.namingInstructions')}
        color={theme.colors.tileProgress}
        onStart={() => setShowInstructions(false)}
      />

      <EncouragementBanner
        message={encouragement}
        tone={encouragementTone}
        overlay
        onHide={() => setEncouragement(null)}
      />

      <View style={styles.centerFill}>
        <Text style={styles.prompt}>{t('gameUi.whatIsThis')}</Text>
        <Text style={styles.emoji}>{current.emoji}</Text>

        <View style={styles.optionsList}>
          {current.options.map((label) => (
            <NamingOptionButton
              key={label}
              label={translations.namingItems[label] ?? label}
              state={optionState(label)}
              disabled={answerState !== 'unanswered' && label !== current.correctLabel}
              onPress={() => handleOptionPress(label)}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <HintButton
          hintsRemaining={hintsRemaining}
          maxHints={NAMING_MAX_HINTS}
          onPress={handleHint}
          color={theme.colors.tileProgress}
        />
        <HowToPlayButton
          onPress={() => setShowInstructions(true)}
          color={theme.colors.tileProgress}
        />
      </View>

      <Modal visible={sessionComplete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {resultStars ? (
              <View style={styles.modalStars}>
                <StarRating rating={resultStars} size={64} gap={10} />
              </View>
            ) : null}
            <Text style={styles.modalTitle}>{t('gameUi.roundComplete')}</Text>
            <Text style={styles.modalMessage}>{sessionEndMessage}</Text>
            {nextLevel !== null ? (
                <Text style={styles.modalNext}>
                    {t('gameUi.nextLevel', { level: nextLevel })}
                </Text>
            ) : null}

            <View style={styles.modalButtons}>
              <BigButton
                label={t('gameUi.playAgain')}
                color={theme.colors.tileProgress}
                onPress={() => void startNewSession()}
                style={styles.modalButton}
              />
              <BigButton
                label={t('gameUi.backToGames')}
                variant="outline"
                color={theme.colors.tileProgress}
                onPress={() => navigation.goBack()}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  progressText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    fontWeight: '700',
  },
  prompt: {
    ...theme.typography.title,
    color: theme.colors.foreground,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emoji: {
    fontSize: 96,
    marginBottom: theme.spacing.lg,
  },
  optionsList: {
    width: '100%',
    maxWidth: 360,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.touch.gap,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 45, 36, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    ...surfaceCard(),
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    ...theme.typography.title,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.sm,
  },
  modalStars: {
    marginBottom: theme.spacing.sm,
  },
  modalMessage: {
    ...theme.typography.body,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  modalNext: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
  },
  modalButtons: {
    width: '100%',
    gap: theme.touch.gap,
  },
  modalButton: {
    width: '100%',
  },
});
