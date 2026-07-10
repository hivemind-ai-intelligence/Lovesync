import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AuroraBackground from '@/components/AuroraBackground';
import GlassCard from '@/components/GlassCard';
import { useAuth } from '@/context/AuthContext';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface Song {
  id: string;
  title: string;
  artist: string;
  addedBy: string;
  addedAt: number;
}

async function fetchPlaylist(token: string): Promise<Song[]> {
  const res = await fetch(`${API_BASE}/api/playlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return (await res.json()) as Song[];
}

async function addSong(payload: { title: string; artist: string; token: string }): Promise<Song> {
  const res = await fetch(`${API_BASE}/api/playlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${payload.token}`,
    },
    body: JSON.stringify({ title: payload.title, artist: payload.artist }),
  });
  if (!res.ok) throw new Error('Failed to add song');
  return (await res.json()) as Song;
}

async function removeSong(payload: { id: string; token: string }): Promise<void> {
  const res = await fetch(`${API_BASE}/api/playlist/${payload.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${payload.token}` },
  });
  if (!res.ok) throw new Error('Failed to remove song');
}

function SongCard({
  song,
  username,
  onDelete,
}: {
  song: Song;
  username: string | null;
  onDelete: () => void;
}) {
  const isOwn = song.addedBy === username;

  return (
    <GlassCard style={styles.songCard}>
      <View style={styles.songContent}>
        <View style={styles.songIcon}>
          <Ionicons name="musical-note" size={20} color="#7C5CFF" />
        </View>
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {song.artist}
          </Text>
          <Text style={styles.songMeta}>Added by {song.addedBy}</Text>
        </View>
        {isOwn && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton} testID={`delete-${song.id}`}>
            <Ionicons name="trash-outline" size={18} color="#A6A9B5" />
          </TouchableOpacity>
        )}
      </View>
    </GlassCard>
  );
}

export default function MusicScreen() {
  const { username, token } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['playlist'],
    queryFn: () => (token ? fetchPlaylist(token) : Promise.resolve([])),
    refetchInterval: 5000,
    enabled: !!token,
  });

  const addMutation = useMutation({
    mutationFn: addSong,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['playlist'] });
      setTitle('');
      setArtist('');
      setModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: removeSong,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['playlist'] }),
  });

  const handleAdd = () => {
    if (!title.trim() || !artist.trim() || !token) return;
    addMutation.mutate({ title: title.trim(), artist: artist.trim(), token });
  };

  const paddingTop = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <AuroraBackground>
      <View style={[styles.container, { paddingTop }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Our Playlist</Text>
            <Text style={styles.headerSubtitle}>
              {songs.length} song{songs.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setModalVisible(true);
            }}
            testID="add-song-button"
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Songs List */}
        {songs.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={52} color="#A6A9B5" />
            <Text style={styles.emptyTitle}>No songs yet</Text>
            <Text style={styles.emptySub}>Add the first track to our playlist</Text>
          </View>
        ) : (
          <FlatList
            data={songs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SongCard
                song={item}
                username={username}
                onDelete={() => {
                  if (!token) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  deleteMutation.mutate({ id: item.id, token });
                }}
              />
            )}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) },
            ]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={songs.length > 0}
          />
        )}

        {/* Add Song Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <GlassCard intensity={30} style={styles.modalCard}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add a Song</Text>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Song title"
                  placeholderTextColor="#A6A9B5"
                  value={title}
                  onChangeText={setTitle}
                  returnKeyType="next"
                  autoFocus
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Artist name"
                  placeholderTextColor="#A6A9B5"
                  value={artist}
                  onChangeText={setArtist}
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setModalVisible(false);
                      setTitle('');
                      setArtist('');
                    }}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      (!title.trim() || !artist.trim()) && styles.disabledButton,
                    ]}
                    onPress={handleAdd}
                    disabled={addMutation.isPending || !title.trim() || !artist.trim()}
                  >
                    <Text style={styles.confirmText}>
                      {addMutation.isPending ? 'Adding...' : 'Add Song'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          </View>
        </Modal>
      </View>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  headerSubtitle: {
    color: '#A6A9B5',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C5CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 100,
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  list: {
    paddingHorizontal: 16,
    gap: 10,
    paddingTop: 4,
  },
  songCard: {},
  songContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  songIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(124,92,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  songInfo: { flex: 1, gap: 3 },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  songArtist: {
    color: '#A6A9B5',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  songMeta: {
    color: '#7C5CFF',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  deleteButton: { padding: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5,6,10,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
  },
  modalContent: {
    padding: 28,
    gap: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#A6A9B5',
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#7C5CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: { opacity: 0.45 },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});
