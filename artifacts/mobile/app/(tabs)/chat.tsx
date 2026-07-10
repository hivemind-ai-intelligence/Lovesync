import React, { useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AuroraBackground from '@/components/AuroraBackground';
import { useAuth } from '@/context/AuthContext';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: number;
}

async function fetchMessages(token: string): Promise<Message[]> {
  const res = await fetch(`${API_BASE}/api/chat/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return (await res.json()) as Message[];
}

async function sendMessage(payload: { text: string; token: string }): Promise<Message> {
  const res = await fetch(`${API_BASE}/api/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${payload.token}`,
    },
    body: JSON.stringify({ text: payload.text }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return (await res.json()) as Message;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
      {!isOwn && <Text style={styles.bubbleSender}>{message.username}</Text>}
      <Text style={styles.bubbleText}>{message.text}</Text>
      <Text style={[styles.bubbleTime, isOwn ? styles.ownTime : styles.otherTime]}>
        {formatTime(message.timestamp)}
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const { username, token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => (token ? fetchMessages(token) : Promise.resolve([])),
    refetchInterval: 2000,
    enabled: !!token,
  });

  // Newest first for inverted FlatList
  const sorted = [...messages].sort((a, b) => b.timestamp - a.timestamp);

  const sendMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['messages'] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !token || sendMutation.isPending) return;
    setText('');
    sendMutation.mutate({ text: trimmed, token });
  };

  const paddingTop = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <AuroraBackground>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: paddingTop + 12 }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="heart" size={16} color="#FF5C7C" />
            <Text style={styles.headerTitle}>Just Us Two</Text>
          </View>
          <View style={styles.badge}>
            <View style={styles.onlineDot} />
            <Text style={styles.badgeText}>Private</Text>
          </View>
        </View>

        {/* Messages + Input */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          {/* Empty state outside FlatList to avoid inverted rendering */}
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={52} color="#A6A9B5" />
              <Text style={styles.emptyTitle}>Start the conversation</Text>
              <Text style={styles.emptySub}>Say something sweet</Text>
            </View>
          )}

          <FlatList
            ref={flatListRef}
            data={sorted}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} isOwn={item.username === username} />
            )}
            contentContainerStyle={[
              styles.messagesList,
              { paddingBottom: bottomInset + 90 },
            ]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={sorted.length > 0}
            inverted
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />

          {/* Input Bar */}
          <View
            style={[
              styles.inputBar,
              { paddingBottom: Math.max(bottomInset, 12) },
            ]}
          >
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Say something..."
                placeholderTextColor="#A6A9B5"
                value={text}
                onChangeText={setText}
                multiline
                returnKeyType="default"
              />
              <TouchableOpacity
                style={[styles.sendButton, !text.trim() && styles.sendDisabled]}
                onPress={handleSend}
                disabled={!text.trim() || sendMutation.isPending}
                testID="send-button"
              >
                <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124,92,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.22)',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CFF7C',
  },
  badgeText: {
    color: '#A6A9B5',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  emptyState: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 0,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  emptySub: {
    color: '#A6A9B5',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 3,
    marginVertical: 1,
  },
  ownBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#7C5CFF',
    borderBottomRightRadius: 5,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    borderBottomLeftRadius: 5,
  },
  bubbleSender: {
    color: '#9F84FF',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 1,
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 21,
  },
  bubbleTime: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    alignSelf: 'flex-end',
  },
  ownTime: { color: 'rgba(255,255,255,0.55)' },
  otherTime: { color: '#A6A9B5' },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(5,6,10,0.97)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7C5CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: 'rgba(124,92,255,0.35)' },
});
