"use client";

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Check, CreditCard, Calendar, Users,
  MapPin, Star, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";

const mockItems: Record<string, { name: string; location: string; rating: number; image: string; price: number; description: string }> = {
  hotel: { name: "Le Marais Boutique Hotel", location: "Paris, France", rating: 4.8, image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80", price: 170, description: "Charming boutique hotel in the heart of Le Marais with beautifully appointed rooms and a rooftop terrace." },
  flight: { name: "Air France AF083 - SFO to CDG", location: "San Francisco to Paris", rating: 4.5, image: "https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80", price: 620, description: "Direct flight, 10h 45m. Economy class with meal service and entertainment." },
  restaurant: { name: "Le Jules Verne", location: "Eiffel Tower, Paris", rating: 4.9, image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80", price: 145, description: "Michelin-starred restaurant on the second floor of the Eiffel Tower with panoramic views." },
  experience: { name: "Louvre Museum Skip-the-Line Tour", location: "Paris, France", rating: 4.7, image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80", price: 85, description: "3-hour guided tour with priority access to the Mona Lisa and other masterpieces." },
  rental: { name: "Peugeot 3008 SUV", location: "Paris CDG Airport", rating: 4.3, image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=800&q=80", price: 55, description: "Compact SUV with GPS, automatic transmission, and full insurance coverage." },
  cruise: { name: "Mediterranean Discovery - 7 Nights", location: "Barcelona to Athens", rating: 4.6, image: "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800&q=80", price: 1890, description: "Visit 5 ports including Marseille, Rome, Santorini, and Mykonos. All meals included." },
};

const steps = ["Details", "Review", "Payment", "Confirmation"];

export default function BookingPage() {
  const params = useParams();
  const bookingType = (params.type as string) || "hotel";
  const item = mockItems[bookingType] || mockItems.hotel;

  const [step, setStep] = useState(0);
  const [checkIn, setCheckIn] = useState("2026-03-15");
  const [checkOut, setCheckOut] = useState("2026-03-22");
  const [guests, setGuests] = useState("2");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const nights = 7;
  const subtotal = item.price * nights;
  const taxes = Math.round(subtotal * 0.12);
  const serviceFee = Math.round(subtotal * 0.05);
  const total = subtotal + taxes + serviceFee;

  const nextStep = () => setStep((s) => Math.min(3, s + 1));
  const prevStep = () => setStep((s) => Math.max(0, s - 1));

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1 mb-4"><ArrowLeft className="h-4 w-4" />Back</Link>
          <div className="flex items-center justify-between">
            {steps.map((label, i) => (
              <div key={label} className="flex items-center">
                <div className={cn("flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium border-2 transition-colors", i < step ? "bg-sky-600 border-sky-600 text-white" : i === step ? "border-sky-600 text-sky-600" : "border-slate-300 text-slate-400")}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={cn("ml-2 text-sm font-medium hidden sm:inline", i <= step ? "text-slate-900" : "text-slate-400")}>{label}</span>
                {i < steps.length - 1 && <div className={cn("w-8 sm:w-16 h-0.5 mx-2", i < step ? "bg-sky-600" : "bg-slate-200")} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === 0 && (
              <Card>
                <CardHeader><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Booking Details</h2></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input label={bookingType === "flight" ? "Departure Date" : "Check-in"} type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} icon={<Calendar className="h-4 w-4" />} />
                    <Input label={bookingType === "flight" ? "Return Date" : "Check-out"} type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} icon={<Calendar className="h-4 w-4" />} />
                  </div>
                  <Select label={bookingType === "flight" ? "Passengers" : "Guests"} value={guests} onChange={(e) => setGuests(e.target.value)} options={[
                    { value: "1", label: "1 Guest" }, { value: "2", label: "2 Guests" },
                    { value: "3", label: "3 Guests" }, { value: "4", label: "4 Guests" },
                  ]} />
                  {bookingType === "hotel" && (
                    <Select label="Room Type" options={[
                      { value: "standard", label: "Standard Room" },
                      { value: "deluxe", label: "Deluxe Room (+$40/night)" },
                      { value: "suite", label: "Suite (+$120/night)" },
                    ]} />
                  )}
                  {bookingType === "flight" && (
                    <Select label="Class" options={[
                      { value: "economy", label: "Economy" },
                      { value: "premium", label: "Premium Economy (+$280)" },
                      { value: "business", label: "Business (+$1,400)" },
                    ]} />
                  )}
                  <div className="flex justify-end pt-4">
                    <Button onClick={nextStep}>Continue<ArrowRight className="h-4 w-4 ml-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 1 && (
              <Card>
                <CardHeader><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Review Your Booking</h2></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Dates</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{checkIn} to {checkOut}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Guests</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{guests}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{formatCurrency(item.price)} x {nights} nights</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Taxes & fees</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(taxes)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Service fee</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(serviceFee)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-slate-900 dark:text-white">Total</span>
                      <span className="font-bold text-lg text-slate-900 dark:text-white">{formatCurrency(total)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between pt-6">
                    <Button variant="outline" onClick={prevStep}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
                    <Button onClick={nextStep}>Proceed to Payment<ArrowRight className="h-4 w-4 ml-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Payment Information</h2></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200 text-sm text-green-700">
                    <Shield className="h-4 w-4 shrink-0" />Your payment information is encrypted and secure.
                  </div>
                  <Input label="Name on Card" placeholder="John Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} />
                  <Input label="Card Number" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} icon={<CreditCard className="h-4 w-4" />} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Expiry Date" placeholder="MM/YY" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} />
                    <Input label="CVC" placeholder="123" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} />
                  </div>
                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={prevStep}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
                    <Button onClick={nextStep}>Pay {formatCurrency(total)}</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mx-auto mb-6">
                    <Check className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Booking Confirmed!</h2>
                  <p className="text-slate-600 mb-2">Your booking has been successfully placed.</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Booking Reference: <span className="font-mono font-semibold text-slate-900 dark:text-white">ATL-{Math.random().toString(36).slice(2, 10).toUpperCase()}</span></p>
                  <div className="flex gap-3 justify-center">
                    <Link href="/trips"><Button>View My Trips</Button></Link>
                    <Link href="/"><Button variant="outline">Back to Home</Button></Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Item Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <div className="aspect-video overflow-hidden rounded-t-xl">
                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
              </div>
              <CardContent>
                <h3 className="font-semibold text-slate-900 dark:text-white">{item.name}</h3>
                <div className="flex items-center gap-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3.5 w-3.5" />{item.location}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">{item.rating}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">{item.description}</p>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Price</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(item.price)}<span className="text-sm font-normal text-slate-500 dark:text-slate-400">/{bookingType === "hotel" ? "night" : bookingType === "rental" ? "day" : "person"}</span></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
