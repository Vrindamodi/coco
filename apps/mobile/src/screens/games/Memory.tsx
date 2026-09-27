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
import { MemoryTile } from '@/components/games/memory/MemoryTile';
import {
    MEMORY_CARD_POOL,
    MEMORY_LEVEL_CONFIG,
    MEMORY_MAX_HINTS,
} from '@/data/memoryData';
import { shuffle } from '@/utils/shuffle';
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import { useTranslation } from '@/i18n';
import { scoreToStars } from '@/utils/difficulty';
import {
    randomFrom,
} from '@/utils/encouragement';
import type { StarRating as StarRatingValue } from '@/utils/types';
import { ScreenLayout } from '@/components/ScreenLayout';

interface DeckCard {
    id: string;
    emoji: string;
    label: string;
}

function buildDeck(level: number): DeckCard[] {
    const config = MEMORY_LEVEL_CONFIG[level] ?? MEMORY_LEVEL_CONFIG[1];
    const chosen = shuffle(MEMORY_CARD_POOL).slice(0, config.pairs);
    const pairCards: DeckCard[] = chosen.flatMap((item, index) => [
        { id: `${index}-a-${item.label}`, emoji: item.emoji, label: item.label },
        { id: `${index}-b-${item.label}`, emoji: item.emoji, label: item.label },
    ]);
    return shuffle(pairCards);
}

export function MemoryMatchScreen() {
    const navigation = useNavigation();
    const { t, translations } = useTranslation();
    const { width } = useWindowDimensions();

    const patientId = useAuthStore((state) => state.patientId);

    const [loading, setLoading] = useState(true);
    const [level, setLevel] = useState(1);
    const [deck, setDeck] = useState<DeckCard[]>([]);
    const [flippedIds, setFlippedIds] = useState<string[]>([]);
    const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [hintsRemaining, setHintsRemaining] = useState(MEMORY_MAX_HINTS);
    const [hintRevealAll, setHintRevealAll] = useState(false);
    const [encouragement, setEncouragement] = useState<string | null>(null);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [resultStars, setResultStars] = useState<StarRatingValue | null>(null);
    const [nextLevel, setNextLevel] = useState<number | null>(null);
    const [movesDisplay, setMovesDisplay] = useState(0);
    const [showInstructions, setShowInstructions] = useState(true);

    const movesRef = useRef(0);
    const hintsUsedRef = useRef(0);
    const startTimeRef = useRef(0);

    function getStartingLevel(): Promise<number> {
        return useGameStore.getState().startLevelFor(patientId, "memory_match");
    }

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const startingLevel = await getStartingLevel();

            if (cancelled) return;
            setLevel(startingLevel);
            setDeck(buildDeck(startingLevel));
            startTimeRef.current = Date.now();
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [patientId]);

    const config = MEMORY_LEVEL_CONFIG[level] ?? MEMORY_LEVEL_CONFIG[1];
    const columns = config.columns;

    const tileSize = useMemo(() => {
        const horizontalPadding = theme.spacing.lg * 2;
        const tileMargin = 12; // 6 on each side, per tile
        const available = width - horizontalPadding - columns * tileMargin;
        const raw = available / columns;
        return Math.max(56, Math.min(90, raw));
    }, [width, columns]);

    async function startNewSession() {
        const atLevel = await getStartingLevel();
        setLevel(atLevel);
        setDeck(buildDeck(atLevel));
        setFlippedIds([]);
        setMatchedIds(new Set());
        setBusy(false);
        setHintsRemaining(MEMORY_MAX_HINTS);
        setHintRevealAll(false);
        setEncouragement(null);
        setSessionComplete(false);
        setResultStars(null);
        setNextLevel(null);
        setShowInstructions(true);
        movesRef.current = 0;
        setMovesDisplay(0);
        hintsUsedRef.current = 0;
        startTimeRef.current = Date.now();
    }

    function finishSession() {
        const durationMs = Date.now() - startTimeRef.current;
        const accuracy = Math.min(1, config.pairs / Math.max(1, movesRef.current));
        const stars = scoreToStars(accuracy, hintsUsedRef.current);
        setResultStars(stars);
        setSessionComplete(true);

        // Saved on-device and queued for the server in one step; the modal
        // does not wait for either.
        useGameStore
            .getState()
            .finishSession({
                patientId,
                gameType: "memory_match",
                accuracy,
                hintsUsed: hintsUsedRef.current,
                durationMs,
                level,
            })
            .then((result) => setNextLevel(result.nextLevel))
            .catch((error) => {
                console.warn("Failed to save game session", error);
            });
    }

    function handleCardPress(cardId: string) {
        if (busy || sessionComplete) return;
        if (matchedIds.has(cardId) || flippedIds.includes(cardId)) return;

        if (flippedIds.length === 0) {
            setFlippedIds([cardId]);
            return;
        }

        const firstId = flippedIds[0];
        const firstCard = deck.find((c) => c.id === firstId);
        const secondCard = deck.find((c) => c.id === cardId);
        if (!firstCard || !secondCard) return;

        setFlippedIds([firstId, cardId]);
        movesRef.current += 1;
        setMovesDisplay(movesRef.current);
        setBusy(true);

        const isMatch = firstCard.label === secondCard.label;

        if (isMatch) {
            setTimeout(() => {
                setMatchedIds((prev) => {
                    const next = new Set(prev);
                    next.add(firstId);
                    next.add(cardId);
                    if (next.size === deck.length) {
                        // Defer so state settles before we compute the summary.
                        setTimeout(finishSession, 0);
                    }
                    return next;
                });
                setFlippedIds([]);
                setBusy(false);
            }, 500);
        } else {
            setEncouragement(randomFrom(translations.gameFeedback.gentleRetry));
            setTimeout(() => {
                setFlippedIds([]);
                setBusy(false);
            }, 950);
        }
    }

    function handleHint() {
        if (hintsRemaining <= 0 || busy || sessionComplete) return;
        hintsUsedRef.current += 1;
        setHintsRemaining((r) => r - 1);
        setBusy(true);
        setHintRevealAll(true);
        setTimeout(() => {
            setHintRevealAll(false);
            setBusy(false);
        }, 1400);
    }

    if (loading) {
        return (
            <ScreenLayout scrollable={false}>
                <GameHeader title={`${t('gameUi.level')} ${level}`} color={theme.colors.tilePlay} onBack={() => navigation.goBack()} />
                <View style={styles.centerFill}>
                    <InstructionCard
                        message={t('gameUi.memoryInstructions')}
                        color={theme.colors.tilePlay}
                    />
                </View>
            </ScreenLayout>
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

    return (
        <ScreenLayout scrollable={false}>
            <GameHeader
                title={`${t('gameUi.level')} ${level}`}
                color={theme.colors.tilePlay}
                onBack={() => navigation.goBack()}
                progress={{ current: matchedIds.size / 2, total: config.pairs }}
                rightSlot={
                    <Text style={styles.pairsText}>
                        {matchedIds.size / 2}/{config.pairs}
                    </Text>
                }
            />

            <InstructionBanner
                visible={showInstructions}
                message={t('gameUi.memoryInstructions')}
                color={theme.colors.tilePlay}
                onStart={() => setShowInstructions(false)}
            />

            <EncouragementBanner
                message={encouragement}
                overlay
                onHide={() => setEncouragement(null)}
            />

            <View style={styles.grid}>
                {deck.map((card) => (
                    <MemoryTile
                        key={card.id}
                        emoji={card.emoji}
                        label={card.label}
                        faceUp={matchedIds.has(card.id) || flippedIds.includes(card.id) || hintRevealAll}
                        matched={matchedIds.has(card.id)}
                        size={tileSize}
                        disabled={busy}
                        onPress={() => handleCardPress(card.id)}
                    />
                ))}
            </View>

            <View style={styles.footer}>
                <HintButton
                    hintsRemaining={hintsRemaining}
                    maxHints={MEMORY_MAX_HINTS}
                    onPress={handleHint}
                    color={theme.colors.tilePlay}
                />
                <HowToPlayButton
                    onPress={() => setShowInstructions(true)}
                    color={theme.colors.tilePlay}
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
                                color={theme.colors.tilePlay}
                                onPress={() => void startNewSession()}
                                style={styles.modalButton}
                            />
                            <BigButton
                                label={t('gameUi.backToGames')}
                                variant="outline"
                                color={theme.colors.tilePlay}
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
    pairsText: {
        ...theme.typography.body,
        color: theme.colors.muted,
        fontWeight: '700',
    },
    grid: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignContent: 'center',
        paddingHorizontal: theme.spacing.md,
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
