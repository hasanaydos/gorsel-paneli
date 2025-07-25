'use client'

import { useEffect, useState } from 'react'
import { db, storage } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { ref } from 'firebase/storage'

interface Faaliyet {
  id: string
  baslik: string
  faaliyetId: string
}

interface Varyasyon {
  id: string
  faaliyetId: string
  dil: string
  para: string
  slogan: string
  url: string
  storagePath: string
}

// Basit Toast bileşeni
function Toast({ message, onClose }: { message: string, onClose: () => void }) {
  if (!message) return null;
  setTimeout(onClose, 2500);
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow z-50">
      {message}
    </div>
  );
}

// Basit Modal bileşeni
function ShareModal({ open, onClose, onDownload, onShare }: { open: boolean, onClose: () => void, onDownload: () => void, onShare: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[250px] flex flex-col gap-4">
        <h2 className="text-lg font-semibold mb-2">Görseli ne yapmak istersiniz?</h2>
        <button onClick={() => { onDownload(); onClose(); }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Görseli indir</button>
        <button onClick={() => { onShare(); onClose(); }} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Görseli paylaş</button>
        <button onClick={onClose} className="text-gray-500 mt-2">Vazgeç</button>
      </div>
    </div>
  );
}

export default function Home() {
  const [varyasyonlar, setVaryasyonlar] = useState<Varyasyon[]>([])
  const [faaliyetler, setFaaliyetler] = useState<Faaliyet[]>([])
  const [aktifTab, setAktifTab] = useState<'faaliyet' | 'dil' | 'para' | 'slogan'>('faaliyet')
  const [aktifFiltre, setAktifFiltre] = useState<string>('')
  const [toast, setToast] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalImage, setModalImage] = useState<{ url: string, dosyaAdi: string } | null>(null)

  const showToast = (msg: string) => setToast(msg)

  const downloadImage = (url: string, dosyaAdi: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = dosyaAdi;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('İndirme başladı!');
  };

  const shareImage = async (url: string, dosyaAdi: string) => {
    if (navigator.share) {
      await navigator.share({ url });
      showToast('Bağlantı paylaşıldı!');
    } else {
      const whatsappText = encodeURIComponent('Hayırlı Bayramlar');
      window.open(`https://wa.me/?text=${whatsappText}`, '_blank');
      showToast('WhatsApp ile paylaşım başlatıldı!');
    }
  };

  useEffect(() => {
    const fetchVaryasyonlar = async () => {
      const snapshot = await getDocs(collection(db, 'varyasyonlar'))
      const data: Varyasyon[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Varyasyon))
      setVaryasyonlar(data)
    }
    const fetchFaaliyetler = async () => {
      const snapshot = await getDocs(collection(db, 'faaliyetler'))
      const data: Faaliyet[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Faaliyet))
      setFaaliyetler(data)
    }
    fetchVaryasyonlar()
    fetchFaaliyetler()
  }, [])

  // Tab başlıkları ve filtre seçenekleri
  const tablar = [
    { key: 'faaliyet', label: 'Faaliyet' },
    { key: 'dil', label: 'Dil' },
    { key: 'para', label: 'Para Birimi' },
    { key: 'slogan', label: 'Slogan' },
  ] as const

  let filtreSecenekleri: string[] = []
  if (aktifTab === 'faaliyet') {
    filtreSecenekleri = [...new Set(faaliyetler.map(f => f.baslik))]
  } else if (aktifTab === 'dil') {
    filtreSecenekleri = [...new Set(varyasyonlar.map(v => v.dil))]
  } else if (aktifTab === 'para') {
    filtreSecenekleri = [...new Set(varyasyonlar.map(v => v.para))]
  } else if (aktifTab === 'slogan') {
    filtreSecenekleri = [...new Set(varyasyonlar.map(v => v.slogan))]
  }

  // Filtreye göre uygun görselleri bul
  let filtreliVaryasyonlar = varyasyonlar
  if (aktifFiltre) {
    if (aktifTab === 'faaliyet') {
      const seciliFaaliyet = faaliyetler.find(f => f.baslik === aktifFiltre)
      if (seciliFaaliyet) {
        filtreliVaryasyonlar = varyasyonlar.filter(v => v.faaliyetId === seciliFaaliyet.faaliyetId)
      }
    } else if (aktifTab === 'dil') {
      filtreliVaryasyonlar = varyasyonlar.filter(v => v.dil === aktifFiltre)
    } else if (aktifTab === 'para') {
      filtreliVaryasyonlar = varyasyonlar.filter(v => v.para === aktifFiltre)
    } else if (aktifTab === 'slogan') {
      filtreliVaryasyonlar = varyasyonlar.filter(v => v.slogan === aktifFiltre)
    }
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-blue-600">Görsel Galerisi</h1>
      <div className="flex gap-2 border-b pb-2">
        {tablar.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setAktifTab(tab.key); setAktifFiltre('') }}
            className={`px-4 py-2 rounded-t ${aktifTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mb-4">
        {filtreSecenekleri.map(secenek => (
          <button
            key={secenek}
            onClick={() => setAktifFiltre(secenek)}
            className={`px-3 py-1 rounded ${aktifFiltre === secenek ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {secenek}
          </button>
        ))}
      </div>
      <div className="columns-2 gap-4 [column-fill:_balance] sm:columns-2 md:columns-3 lg:columns-4">
        {filtreliVaryasyonlar.map(v => (
          <div key={v.id} className="break-inside-avoid mb-4 border rounded p-2 flex flex-col items-center">
            <img src={v.url} alt={v.slogan} className="w-full h-auto rounded mb-2" />
            <div className="text-xs text-gray-600 mb-1">{v.dil} | {v.para} | {v.slogan}</div>
            <div className="flex gap-2">
              <button onClick={() => downloadImage(v.url, (v.slogan || 'gorsel') + '.jpg')} className="text-blue-600 text-sm border px-2 py-1 rounded hover:bg-blue-50">İndir</button>
            </div>
          </div>
        ))}
        {filtreliVaryasyonlar.length === 0 && (
          <div className="col-span-full text-center text-gray-500">Görsel bulunamadı.</div>
        )}
      </div>
      <Toast message={toast} onClose={() => setToast('')} />
      <ShareModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onDownload={() => modalImage && downloadImage(modalImage.url, modalImage.dosyaAdi)}
        onShare={() => modalImage && shareImage(modalImage.url, modalImage.dosyaAdi)}
      />
    </main>
  )
}
