import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
  Modal,
} from 'react-native';
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
import { PatternPanel } from '@/components/games/pattern/PatternPanel';
import {
  PATTERN_PANEL_COLORS,
  PATTERN_LEVEL_CONFIG,
  PATTERN_MAX_ROUNDS,
  PATTERN_MAX_MISTAKES_PER_ROUND,
  PATTERN_MAX_HINTS,
} from '@/data/patternData';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { useTranslation } from '@/i18n';
import { scoreToStars } from '@/utils/difficulty';
import { delay } from '@/utils/delay';
import {
  randomFrom,
} from '@/utils/encouragement';
import type { StarRating as StarRatingValue } from '@/utils/types';
import { ScreenLayout } from '@/components/ScreenLayout';

const PANEL_LABELS = ['teal panel', 'gold panel', 'coral panel', 'blue panel'];

function randomStep(): number {
  return Math.floor(Math.random() * PATTERN_PANEL_COLORS.length);
}

function buildSequence(length: number): number[] {
  return Array.from({ length }, () => randomStep());
}

type Phase = 'idle' | 'showing' | 'input';

export function PatternScreen() {
  const navigation = useNavigation();
  const { t, translations } = useTranslation();
  const { width } = useWindowDimensions();
  const patientId = useAuthStore((state) => state.patientId);

  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userInputIndex, setUserInputIndex] = useState(0);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [mistakesThisRound, setMistakesThisRound] = useState(0);
  const [activePanel, setActivePanel] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hintsRemaining, setHintsRemaining] = useState(PATTERN_MAX_HINTS);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [resultStars, setResultStars] = useState<StarRatingValue | null>(null);
  const [nextLevel, setNextLevel] = useState<number | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const hintsUsedRef = useRef(0);
  const startTimeRef = useRef(0);
  const sessionTokenRef = useRef(0);

  function getStartingLevel(): Promise<number> {
    return useGameStore.getState().startLevelFor(patientId, 'sequence_recall');
  }

  const panelSize = useMemo(() => {
    const available = Math.min(width, 480) - theme.spacing.lg * 2 - theme.spacing.sm;
    return Math.min(140, available / 2 - 16);
  }, [width]);

  async function playSequence(seq: number[], token: number, atLevel: number) {
    setPhase('showing');
    setUserInputIndex(0);
    const config = PATTERN_LEVEL_CONFIG[atLevel] ?? PATTERN_LEVEL_CONFIG[1];

    for (let i = 0; i < seq.length; i++) {
      if (token !== sessionTokenRef.current) return;
      setActivePanel(seq[i]);
      await delay(config.flashDurationMs);
      if (token !== sessionTokenRef.current) return;
      setActivePanel(null);
      await delay(config.gapDurationMs);
    }
    if (token !== sessionTokenRef.current) return;
    setPhase('input');
  }

  async function startWithCountdown(seq: number[], token: number, atLevel: number) {
    for (let seconds = 5; seconds > 0; seconds -= 1) {
      if (token !== sessionTokenRef.current) return;
      setCountdown(seconds);
      await delay(1000);
    }

    if (token !== sessionTokenRef.current) return;
    setCountdown(null);
    await playSequence(seq, token, atLevel);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const startingLevel = await getStartingLevel();

      if (cancelled) return;
      const initSeq = buildSequence(
        (PATTERN_LEVEL_CONFIG[startingLevel] ?? PATTERN_LEVEL_CONFIG[1]).startLength
      );
      setLevel(startingLevel);
      setSequence(initSeq);
      startTimeRef.current = Date.now();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  function finishSession(finalRounds: number) {
    const durationMs = Date.now() - startTimeRef.current;
    const accuracy = Math.min(1, finalRounds / PATTERN_MAX_ROUNDS);
    const stars = scoreToStars(accuracy, hintsUsedRef.current);
    setResultStars(stars);
    setSessionComplete(true);
    setPhase('idle');

    // Saved on-device and queued for the server in one step; the modal
    // does not wait for either.
    useGameStore
      .getState()
      .finishSession({
        patientId,
        gameType: 'sequence_recall',
        accuracy,
        hintsUsed: hintsUsedRef.current,
        durationMs,
        level,
      })
      .then((result) => setNextLevel(result.nextLevel))
      .catch((error) => {
        console.warn('Failed to save pattern game session', error);
      });
  }

  function handlePanelPress(index: number) {
    if (phase !== 'input') return;

    setActivePanel(index);
    setTimeout(() => setActivePanel(null), 200);

    const expected = sequence[userInputIndex];

    if (index === expected) {
      const nextIndex = userInputIndex + 1;
      setUserInputIndex(nextIndex);

      if (nextIndex === sequence.length) {
        const newRoundsCompleted = roundsCompleted + 1;
        setRoundsCompleted(newRoundsCompleted);
        setMistakesThisRound(0);

        if (newRoundsCompleted >= PATTERN_MAX_ROUNDS) {
          finishSession(newRoundsCompleted);
        } else {
          const newSeq = [...sequence, randomStep()];
          setSequence(newSeq);
          setPhase('idle');
          const token = ++sessionTokenRef.current;
          setTimeout(() => playSequence(newSeq, token, level), 750);
        }
      }
    } else {
      const newMistakes = mistakesThisRound + 1;
      setMistakesThisRound(newMistakes);
      setEncouragement(randomFrom(translations.gameFeedback.gentleRetry));

      if (newMistakes >= PATTERN_MAX_MISTAKES_PER_ROUND) {
        finishSession(roundsCompleted);
      } else {
        setPhase('idle');
        const token = ++sessionTokenRef.current;
        setTimeout(() => playSequence(sequence, token, level), 1000);
      }
    }
  }

  function handleHint() {
    if (hintsRemaining <= 0 || phase !== 'input') return;
    hintsUsedRef.current += 1;
    setHintsRemaining((r) => r - 1);
    setPhase('idle');
    const token = ++sessionTokenRef.current;
    setTimeout(() => playSequence(sequence, token, level), 300);
  }

  async function startNewSession() {
    const atLevel = await getStartingLevel();
    const initSeq = buildSequence(
      (PATTERN_LEVEL_CONFIG[atLevel] ?? PATTERN_LEVEL_CONFIG[1]).startLength
    );
    setLevel(atLevel);
    setSequence(initSeq);
    setUserInputIndex(0);
    setRoundsCompleted(0);
    setMistakesThisRound(0);
    setActivePanel(null);
    setHintsRemaining(PATTERN_MAX_HINTS);
    setEncouragement(null);
    setSessionComplete(false);
    setResultStars(null);
    setNextLevel(null);
    setShowInstructions(true);
    setHasStarted(false);
    hintsUsedRef.current = 0;
    startTimeRef.current = Date.now();
  }

  function handleStart() {
    setShowInstructions(false);
    if (hasStarted) return;

    setHasStarted(true);
    const token = ++sessionTokenRef.current;
    setTimeout(() => {
      void startWithCountdown(sequence, token, level);
    }, 500);
  }

  function openInstructions() {
    setShowInstructions(true);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <GameHeader title={`${t('gameUi.level')} ${level}`} color={theme.colors.tileReminders} onBack={() => navigation.goBack()} />
        <View style={styles.centerFill}>
          <InstructionCard
            message={t('gameUi.patternInstructions')}
            color={theme.colors.tileReminders}
          />
        </View>
      </SafeAreaView>
    );
  }

  const sessionEndMessage = resultStars
    ? randomFrom(
        resultStars === 1
          ? translations.gameFeedback.oneStar
          : resultStars === 2
            ? translations.gameFeedback.twoStars
            : translations.gameFeedback.threeStars
      )
    : '';

  const statusText =
    countdown !== null
      ? t('gameUi.startingIn', { count: countdown })
      : phase === 'showing'
        ? t('gameUi.watchClosely')
        : phase === 'input'
          ? t('gameUi.yourTurn')
          : ' ';

  return (
    <ScreenLayout scrollable={false}>
      <GameHeader
        title={`${t('gameUi.level')} ${level}`}
        color={theme.colors.tileReminders}
        onBack={() => navigation.goBack()}
        progress={{ current: roundsCompleted, total: PATTERN_MAX_ROUNDS }}
        rightSlot={<Text style={styles.roundsText}>{t('gameUi.round', { count: roundsCompleted + 1 })}</Text>}
      />

      <InstructionBanner
        visible={showInstructions}
        message={t('gameUi.patternInstructions')}
        color={theme.colors.tileReminders}
        onStart={handleStart}
      />

      <EncouragementBanner
        message={encouragement}
        overlay
        onHide={() => setEncouragement(null)}
      />

      <View style={styles.centerFill}>
        <Text style={styles.status}>{statusText}</Text>

        <View style={styles.grid}>
          {PATTERN_PANEL_COLORS.map((color, index) => (
            <PatternPanel
              key={index}
              color={color}
              active={activePanel === index}
              disabled={phase !== 'input'}
              size={panelSize}
              onPress={() => handlePanelPress(index)}
              accessibilityLabel={PANEL_LABELS[index]}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <HintButton
          hintsRemaining={hintsRemaining}
          maxHints={PATTERN_MAX_HINTS}
          onPress={handleHint}
          color={theme.colors.tileReminders}
        />
        <HowToPlayButton
          onPress={openInstructions}
          color={theme.colors.tileReminders}
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
                color={theme.colors.tileReminders}
                onPress={() => void startNewSession()}
                style={styles.modalButton}
              />
              <BigButton
                label={t('gameUi.backToGames')}
                variant="outline"
                color={theme.colors.tileReminders}
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
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  roundsText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    fontWeight: '700',
  },
  status: {
    ...theme.typography.title,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 340,
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
