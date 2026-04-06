import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import LexicalEditorDOM from './LexicalEditorDOM';
import { Colors } from '@/constants/colors';

interface LexicalEditorNativeProps {
  content: string;
  onChangeContent: (content: string) => void;
  onMediaSelect?: (media: { uri: string; type: string }[]) => void;
  onFileSelect?: (files: DocumentPicker.DocumentPickerAsset[]) => void;
  maxWords?: number;
  placeholder?: string;
  darkMode?: boolean;
}

export default function LexicalEditorNative({
  content,
  onChangeContent,
  onMediaSelect,
  onFileSelect,
  maxWords = 300,
  placeholder = "What's on your mind?",
  darkMode = false,
}: LexicalEditorNativeProps) {
  const [wordCount, setWordCount] = useState(0);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const toolbarAnim = useRef(new Animated.Value(0)).current;

  const handleWordCountChange = useCallback((count: number, overLimit: boolean) => {
    setWordCount(count);
    setIsOverLimit(overLimit);
  }, []);

  const showFloatingToolbar = useCallback(() => {
    setShowToolbar(true);
    Animated.spring(toolbarAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [toolbarAnim]);

  const hideFloatingToolbar = useCallback(() => {
    Animated.timing(toolbarAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowToolbar(false));
  }, [toolbarAnim]);

  const pickMedia = async (type: 'images' | 'videos') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [type],
      quality: 0.8,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    });
    
    if (!result.canceled && result.assets) {
      const media = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
      }));
      onMediaSelect?.(media);
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
    
    if (!result.canceled && result.assets) {
      onFileSelect?.(result.assets);
    }
  };

  return (
    <View style={styles.container}>
      {/* Word count indicator */}
      <View style={styles.wordCountContainer}>
        <Text style={[styles.wordCountText, isOverLimit && styles.wordCountOverLimit]}>
          {wordCount}/{maxWords} words
        </Text>
        {isOverLimit && (
          <Text style={styles.overLimitText}>Over limit</Text>
        )}
      </View>

      {/* Editor */}
      <View style={styles.editorContainer}>
        <LexicalEditorDOM
          initialContent={content}
          onChange={onChangeContent}
          onWordCountChange={handleWordCountChange}
          placeholder={placeholder}
          darkMode={darkMode}
          maxWords={maxWords}
        />
      </View>

      {/* Floating Toolbar */}
      {showToolbar && (
        <Animated.View
          style={[
            styles.floatingToolbar,
            {
              transform: [
                {
                  translateY: toolbarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
              opacity: toolbarAnim,
            },
          ]}
        >
          <View style={styles.toolbarContent}>
            <ToolbarButton
              icon="add-circle-outline"
              onPress={() => {}}
            />
            <ToolbarButton
              icon="image-outline"
              onPress={() => {}}
            />
            <ToolbarButton
              icon="videocam-outline"
              onPress={() => {}}
            />
            <ToolbarButton
              icon="list-outline"
              onPress={() => {}}
            />
          </View>
        </Animated.View>
      )}

      {/* Bottom toolbar */}
      <View style={styles.bottomToolbar}>
        <View style={styles.mediaButtons}>
          <TouchableOpacity
            onPress={() => pickMedia('images')}
            style={styles.iconButton}
          >
            <Ionicons name="image-outline" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => pickMedia('videos')}
            style={styles.iconButton}
          >
            <Ionicons name="videocam-outline" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickFile}
            style={styles.iconButton}
          >
            <Ionicons name="document-attach-outline" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ToolbarButton({
  icon,
  onPress,
  isActive = false,
}: {
  icon: string;
  onPress: () => void;
  isActive?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.toolbarButton, isActive && styles.toolbarButtonActive]}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={isActive ? Colors.onPrimary : Colors.onSurfaceVariant}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wordCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  wordCountText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: Colors.onSurfaceVariant,
  },
  wordCountOverLimit: {
    color: '#ef4444',
    fontFamily: 'DMSans_600SemiBold',
  },
  overLimitText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: '#ef4444',
  },
  editorContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  floatingToolbar: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toolbarContent: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 12,
    padding: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButtonActive: {
    backgroundColor: Colors.primary,
  },
  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  iconButton: {
    padding: 8,
  },
});
