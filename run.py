import os
import shutil
import subprocess
import torch
import cv2
from PIL import Image
import numpy as np
from tqdm import tqdm
from deeplab.utils import *
from pythonosc import dispatcher
from pythonosc import osc_server
from pythonosc import udp_client
from spleeter.separator import Separator

client = udp_client.SimpleUDPClient("127.0.0.1", 54000)

def video_input(unused_addr, args, *values):
    input_path = str(values[0])
    file_name  = input_path.split('/')[1].split('.')[0]
    os.makedirs('./output/' + file_name, exist_ok=True)
    video_path = './output/' + file_name
    command0 = 'ffmpeg -i ' + input_path + ' -r 30 ' + video_path + '/input.mp4'
    subprocess.call(command0, shell=True)
    input_path = video_path + '/input.mp4'
    mask_path  = video_path + '/mask'
    frame_path = video_path + '/frames'
    inpaint_path = video_path + '/inpaint'
    audio_path = video_path + '/audio'
    output_name = './output/' + file_name + '.mp4'

    mp42img(input_path, mask_path, 'frame', 'mask', 'png')
    mp42img(input_path, frame_path, 'frame', 'frames', 'png')

    inpainting(video_path, inpaint_path, frame_path, mask_path)

    file_num = sum(os.path.isfile(os.path.join(inpaint_path, name)) for name in os.listdir(inpaint_path))
    command1 = 'ffmpeg -r 30 -start_number 0 -i ' + inpaint_path + '/' + 'frame_%03d.png -vframes ' + str(file_num) + ' -vcodec libx264 -pix_fmt yuv420p -r 30 ' + video_path + '/results.mp4'
    subprocess.call(command1, shell=True)

    spleeter(input_path, audio_path)
    spleeter_path = audio_path + '/audio'
    command2 = 'ffmpeg -i ' + video_path + '/results.mp4 -i ' + spleeter_path + '/accompaniment.wav -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 ' + output_name
    subprocess.call(command2, shell=True)
    shutil.rmtree(video_path)

    client.send_message("/inpaint_path", output_name)



def mp42img(video_path, output_path, basename, label, ext='jpg'):
    print("mp4 to img")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return

    os.makedirs(output_path, exist_ok=True)
    fps = cap.get(cv2.CAP_PROP_FPS)
    print(fps)
    if os.path.isfile(output_path + "/" + "frame_000.png"):
        print("file exists!!")
        return
    base_path = os.path.join(output_path, basename)
    digit = len(str(int(cap.get(cv2.CAP_PROP_FRAME_COUNT))))

    n = 0
    while True:
        ret, frame = cap.read()
        if ret:
            if label == 'mask':
                labels = utils.get_pred(frame, deeplab_model)
                segment_mask = labels == 15
                segment_mask = np.repeat(segment_mask[:, :, np.newaxis], 3, axis = 2)

                output = (segment_mask * 255).astype("uint8")
                cv2.imwrite('{}_{}.{}'.format(base_path, str(n).zfill(digit), ext), output)
            elif label == 'frames':
                cv2.imwrite('{}_{}.{}'.format(base_path, str(n).zfill(digit), ext), frame)

            n += 1
            if n % 100 == 0:
                print(str(n) + " files output!")
        else:
            print(str(n) + " files output!")
            return

def inpainting(video_path, inpaint_path, frame_path, mask_path):
    os.makedirs(inpaint_path, exist_ok=True)

    if os.path.isfile(inpaint_path + "/" + "frame_000.png"):
        print("file exists!!")
        return

    for frame in tqdm(os.listdir(frame_path)):
        frame_img = cv2.imread(frame_path + "/" + frame)
        mask_img  = cv2.imread(mask_path + "/" + frame, cv2.IMREAD_GRAYSCALE)
        inpaint_img = cv2.inpaint(frame_img, mask_img, 10, cv2.INPAINT_TELEA)
        cv2.imwrite(inpaint_path + "/" + frame, inpaint_img)


def spleeter(input_path, audio_path):
    os.makedirs(audio_path, exist_ok=True)
    command = 'ffmpeg -i ' + input_path + ' -f mp3 -ar 44100 -vn ' + audio_path + '/audio.mp3'
    subprocess.call(command, shell=True)
    input_audio = audio_path + '/audio.mp3'
    separator_2stem = Separator('spleeter:2stems')
    separator_2stem.separate_to_file(input_audio, audio_path)


if __name__ == "__main__":
    deeplab_model = utils.load_model()

    dispatcher = dispatcher.Dispatcher()
    dispatcher.map("/path", video_input, "video input")

    server = osc_server.ThreadingOSCUDPServer(("127.0.0.1", 6970), dispatcher)
    print("Serving on {}".format(server.server_address))
    server.serve_forever()