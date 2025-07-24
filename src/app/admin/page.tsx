'use client'

import { useEffect, useState } from 'react'
import { db, storage } from '@/lib/firebase'
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
  orderBy,
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll
} from 'firebase/storage'
import { v4 as uuidv4 } from 'uuid'

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

export default function AdminPage() {
  const [faaliyetler, setFaaliyetler] = useState<Faaliyet[]>([])
  const [varyasyonlar, setVaryasyonlar] = useState<Varyasyon[]>([])
  const [baslik, setBaslik] = useState('')
  const [seciliFaaliyet, setSeciliFaaliyet] = useState('')
  const [dil, setDil] = useState('')
  const [para, setPara] = useState('')
  const [slogan, setSlogan] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [mesaj, setMesaj] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null)
  const [yeniBaslik, setYeniBaslik] = useState('')
  const [duzenlenenVaryasyonId, setDuzenlenenVaryasyonId] = useState<string | null>(null)
  const [duzenlenenDil, setDuzenlenenDil] = useState('')
  const [duzenlenenPara, setDuzenlenenPara] = useState('')
  const [duzenlenenSlogan, setDuzenlenenSlogan] = useState('')

  useEffect(() => {
    faaliyetleriYukle()
    varyasyonlariYukle()
  }, [])

  const faaliyetleriYukle = async () => {
    const snapshot = await getDocs(collection(db, 'faaliyetler'))
    const data: Faaliyet[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Faaliyet))
    setFaaliyetler(data)
  }

  const varyasyonlariYukle = async () => {
    const snapshot = await getDocs(query(collection(db, 'varyasyonlar'), orderBy('createdAt', 'desc')))
    const data: Varyasyon[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Varyasyon))
    setVaryasyonlar(data)
  }

  const yeniFaaliyetEkle = async () => {
    if (!baslik) return setMesaj('Faaliyet başlığı boş olamaz')
    const faaliyetId = baslik.toLowerCase().replace(/\s+/g, '-')
    try {
      await addDoc(collection(db, 'faaliyetler'), { baslik, faaliyetId })
      setMesaj('Faaliyet eklendi')
      setBaslik('')
      faaliyetleriYukle()
    } catch (e) {
      console.error(e)
      setMesaj('Faaliyet eklenemedi')
    }
  }

  const varyasyonEkle = async () => {
    if (!seciliFaaliyet || !dil || !para || !slogan || !file) {
      setMesaj('Tüm alanları doldurun')
      return
    }
    const dosyaAdi = `${dil}_${para}_${slogan}_${uuidv4()}`
    const storageRef = ref(storage, `faaliyetler/${seciliFaaliyet}/${dosyaAdi}`)
    try {
      setLoading(true)
      setSuccess(false)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await addDoc(collection(db, 'varyasyonlar'), {
        faaliyetId: seciliFaaliyet,
        dil,
        para,
        slogan,
        url,
        storagePath: storageRef.fullPath,
        createdAt: new Date(),
      })
      setDil('')
      setPara('')
      setSlogan('')
      setFile(null)
      setMesaj('Varyasyon eklendi')
      setSuccess(true)
      varyasyonlariYukle()
    } catch (e) {
      console.error(e)
      setMesaj('Yükleme hatası')
    } finally {
      setLoading(false)
      setTimeout(() => setSuccess(false), 2000)
    }
  }

  const sil = async (v: Varyasyon) => {
    const onay = confirm('Silmek istediğinize emin misiniz?')
    if (!onay) return
    try {
      await deleteDoc(doc(db, 'varyasyonlar', v.id))
      await deleteObject(ref(storage, v.storagePath))
      varyasyonlariYukle()
      setMesaj('Silindi')
    } catch (e) {
      console.error(e)
      setMesaj('Silinemedi')
    }
  }

  const faaliyetSil = async (f: Faaliyet) => {
    const onay = confirm(`${f.baslik} faaliyetini ve tüm görsellerini silmek istiyor musunuz?`)
    if (!onay) return
    try {
      const varyasyonSnapshot = await getDocs(query(collection(db, 'varyasyonlar'), where('faaliyetId', '==', f.faaliyetId)))
      for (const docSnap of varyasyonSnapshot.docs) {
        const data = docSnap.data() as Varyasyon
        await deleteDoc(doc(db, 'varyasyonlar', docSnap.id))
        if (data.storagePath) await deleteObject(ref(storage, data.storagePath)).catch(() => {})
      }
      await deleteDoc(doc(db, 'faaliyetler', f.id))
      setMesaj('Faaliyet silindi')
      faaliyetleriYukle()
      varyasyonlariYukle()
    } catch (e) {
      console.error(e)
      setMesaj('Faaliyet silinirken hata')
    }
  }

  const baslikGuncelle = async (f: Faaliyet) => {
    if (!yeniBaslik.trim()) return
    try {
      const docRef = doc(db, 'faaliyetler', f.id)
      await updateDoc(docRef, {
        baslik: yeniBaslik,
        // faaliyetId sabit kalıyor, böylece varyasyonlar kaybolmaz
      })
      setMesaj('Faaliyet güncellendi')
      setDuzenlenenId(null)
      faaliyetleriYukle()
    } catch (e) {
      console.error(e)
      setMesaj('Güncelleme hatası')
    }
  }

  const varyasyonDuzenle = (v: Varyasyon) => {
    setDuzenlenenVaryasyonId(v.id)
    setDuzenlenenDil(v.dil)
    setDuzenlenenPara(v.para)
    setDuzenlenenSlogan(v.slogan)
  }

  const varyasyonGuncelle = async (v: Varyasyon) => {
    if (!duzenlenenDil.trim() || !duzenlenenPara.trim() || !duzenlenenSlogan.trim()) return
    try {
      const docRef = doc(db, 'varyasyonlar', v.id)
      await updateDoc(docRef, {
        dil: duzenlenenDil,
        para: duzenlenenPara,
        slogan: duzenlenenSlogan,
      })
      setMesaj('Varyasyon güncellendi')
      setDuzenlenenVaryasyonId(null)
      varyasyonlariYukle()
    } catch (e) {
      console.error(e)
      setMesaj('Varyasyon güncellenemedi')
    }
  }

  const varyasyonDuzenlemeIptal = () => {
    setDuzenlenenVaryasyonId(null)
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-blue-600">Admin Paneli</h1>

      <div className="space-y-2">
        <h2 className="font-semibold">Yeni Faaliyet Ekle</h2>
        <input
          value={baslik}
          onChange={(e) => setBaslik(e.target.value)}
          placeholder="Faaliyet Başlığı"
          className="border p-2 w-full rounded"
        />
        <button
          onClick={yeniFaaliyetEkle}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >Ekle</button>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">Varyasyon Ekle</h2>
        <select
          value={seciliFaaliyet}
          onChange={(e) => setSeciliFaaliyet(e.target.value)}
          className="border p-2 w-full rounded"
        >
          <option value="">Faaliyet seçin</option>
          {faaliyetler.map((f) => (
            <option key={f.id} value={f.faaliyetId}>{f.baslik}</option>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <input value={dil} onChange={(e) => setDil(e.target.value)} placeholder="Dil" className="border p-2 rounded" />
          <input value={para} onChange={(e) => setPara(e.target.value)} placeholder="Para" className="border p-2 rounded" />
          <input value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Slogan" className="border p-2 rounded" />
        </div>

        <div className="flex items-center gap-4">
          <label className="cursor-pointer inline-block px-4 py-2 bg-gray-200 text-black rounded border border-gray-300 text-sm hover:bg-gray-300 dark:text-white dark:bg-gray-700 dark:hover:bg-gray-600">
            Dosya Seç
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>

          {file && (
            <button
              onClick={varyasyonEkle}
              disabled={loading}
              className={`px-4 py-2 rounded text-white ${loading ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {loading ? 'Yükleniyor...' : 'Dosyayı Yükle'}
            </button>
          )}
        </div>

        {file && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Seçilen dosya: {file.name}</p>
        )}

        {success && (
          <div className="mt-2 p-2 text-green-700 bg-green-100 border border-green-300 rounded">
            ✅ Görsel yüklendi!
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold">Faaliyetler</h2>
        {faaliyetler.map((f) => (
          <div key={f.id} className="border rounded p-4">
            <div className="flex justify-between items-center mb-2">
              {duzenlenenId === f.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    value={yeniBaslik}
                    onChange={(e) => setYeniBaslik(e.target.value)}
                    className="border p-1 rounded w-full"
                  />
                  <button onClick={() => baslikGuncelle(f)} className="text-green-600 text-2xl">✓</button>
                  <button onClick={() => setDuzenlenenId(null)} className="text-gray-500 text-2xl">×</button>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-lg">{f.baslik}</h3>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setDuzenlenenId(f.id);
                        setYeniBaslik(f.baslik);
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >Düzenle</button>
                    <button
                      onClick={() => faaliyetSil(f)}
                      className="text-xs text-red-600 hover:underline"
                    >Faaliyeti Sil</button>
                  </div>
                </>
              )}
            </div>
            <div className="columns-2 gap-4 [column-fill:_balance] sm:columns-2 md:columns-3 lg:columns-4">
              {varyasyonlar
                .filter((v) => v.faaliyetId === f.faaliyetId)
                .map((v) => (
                  <div key={v.id} className="break-inside-avoid mb-4">
                    <img src={v.url} className="w-full h-auto rounded border" />
                    {duzenlenenVaryasyonId === v.id ? (
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="flex gap-1 max-w-[160px]">
                          <input value={duzenlenenDil} onChange={e => setDuzenlenenDil(e.target.value)} className="border p-1 rounded text-sm flex-1 min-w-0" placeholder="Dil" />
                          <input value={duzenlenenPara} onChange={e => setDuzenlenenPara(e.target.value)} className="border p-1 rounded text-sm flex-1 min-w-0" placeholder="Para" />
                          <input value={duzenlenenSlogan} onChange={e => setDuzenlenenSlogan(e.target.value)} className="border p-1 rounded text-sm flex-1 min-w-0" placeholder="Slogan" />
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button onClick={() => varyasyonGuncelle(v)} className="text-green-600 text-xl">✓</button>
                          <button onClick={varyasyonDuzenlemeIptal} className="text-gray-500 text-xl">×</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm mt-1">{v.dil} | {v.para} | {v.slogan}</div>
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => sil(v)}
                            className="text-xs text-red-600 hover:underline"
                          >Sil</button>
                          <button
                            onClick={() => varyasyonDuzenle(v)}
                            className="text-xs text-blue-600 hover:underline"
                          >Düzenle</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {mesaj && <p className="text-sm mt-4 text-gray-700 dark:text-gray-300">{mesaj}</p>}
    </main>
  )
}
