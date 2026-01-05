const OpenAI = require('openai');
const fs = require('fs');

let openai;

console.log('🔍 [openaiService] Module loaded.');
if (process.env.OPENAI_API_KEY) {
    console.log(`✅ [openaiService] OPENAI_API_KEY is available (starts with: ${process.env.OPENAI_API_KEY.substring(0, 3)}...)`);
} else {
    console.error('❌ [openaiService] OPENAI_API_KEY is missing from process.env on module load!');
}

const initializeOpenAI = () => {
    if (openai) return openai;

    const apiKey = process.env.OPENAI_API_KEY;
    console.log('🔍 [openaiService] Checking OPENAI_API_KEY...');
    if (!apiKey) {
        console.error('❌ [openaiService] OPENAI_API_KEY is missing!');
        return null;
    }
    console.log(`✅ [openaiService] OPENAI_API_KEY found (starts with: ${apiKey.substring(0, 3)}...)`);

    openai = new OpenAI({ apiKey });
    console.log('✅ [openaiService] OpenAI client initialized.');
    return openai;
};

/**
 * Transcribe audio buffer using OpenAI Whisper
 * @param {Buffer} audioBuffer - The audio file buffer
 * @param {string} filename - The original filename (for extension)
 * @returns {Promise<string>} The transcription text
 */
const transcribeAudio = async (audioBuffer, filename) => {
    console.log(`🎤 [openaiService] Transcribing audio: ${filename}`);
    const client = initializeOpenAI();

    if (!client) {
        throw new Error('OpenAI API key not configured.');
    }

    try {
        // OpenAI expects a File-like object. We can simulate it or write to tmp.
        // Since we have the buffer, let's use the 'file' property as an object with name and content.
        // However, the OpenAI Node SDK 'file' argument usually expects a ReadStream or a File object.
        // Using a temporary file is the most robust way with the current SDK.

        const tempFilePath = `/tmp/${Date.now()}_${filename}`;
        // Ensure /tmp exists or use a safe temp directory. 
        // On Windows, /tmp might not exist. Let's use os.tmpdir() or relative path.
        // Actually, simply writing to './temp' relative to this might be safer if we ensure it exists.
        // Better yet, let's try to pass the buffer directly with metadata if supported, 
        // but the standard way is often a stream.

        // Let's rely on writing to a temp file for now as it's reliable.
        const tempDir = require('path').join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const filePath = require('path').join(tempDir, `${Date.now()}-${filename}`);

        fs.writeFileSync(filePath, audioBuffer);

        console.log(`🎤 [openaiService] Temp file created at: ${filePath}`);

        const transcription = await client.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-1",
        });

        console.log(`✅ [openaiService] Transcription complete for: ${filename}`);

        // Cleanup
        fs.unlinkSync(filePath);

        return transcription.text;
    } catch (error) {
        console.error('❌ [openaiService] Transcription failed:', error);
        throw error;
    }
};

module.exports = {
    transcribeAudio
};
